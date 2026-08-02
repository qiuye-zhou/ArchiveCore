import { Logger } from '@nestjs/common'
import type { Redis, RedisOptions } from 'ioredis'
import IORedis from 'ioredis'

import { REDIS } from '~/app.config'

class RedisSubPub {
  public pubClient: Redis
  public subClient: Redis
  private readonly logger = new Logger(RedisSubPub.name)
  private channelPrefix: string = 'qy-channel#'

  constructor() {
    this.init()
  }

  public init() {
    const redisOptions: RedisOptions = {
      host: REDIS.host,
      port: REDIS.port,
      retryStrategy: (times: number) => {
        if (times > 3) {
          this.logger.error('RedisSubPub connection failed after 3 retries')
          return null
        }
        return Math.min(times * 100, 3000)
      },
    }

    if (REDIS.password) {
      redisOptions.password = REDIS.password
    }

    this.pubClient = new IORedis(redisOptions)
    this.subClient = this.pubClient.duplicate()

    this.pubClient.on('error', (err) => {
      this.logger.error('PubClient error:', err.message)
    })

    this.subClient.on('error', (err) => {
      this.logger.error('SubClient error:', err.message)
    })
  }

  public async publish(event: string, data: any) {
    const channel = this.channelPrefix + event
    const _data = JSON.stringify(data)
    if (event !== 'log') {
      Logger.debug(`发布事件：${channel} <- ${_data}`, RedisSubPub.name)
    }
    try {
      await this.pubClient.publish(channel, _data)
    } catch (error) {
      this.logger.error(
        `Failed to publish event ${channel}:`,
        error instanceof Error ? error.message : String(error),
      )
    }
  }

  private calltc = new WeakMap<Function, Callback>()

  public async subscribe(event: string, callback: (data: any) => void) {
    const myChannel = this.channelPrefix + event
    this.subClient.subscribe(myChannel)

    const callb = (channel: string, message: string) => {
      if (channel === myChannel) {
        if (event !== 'log') {
          Logger.debug(`接收事件：${channel} -> ${message}`, RedisSubPub.name)
        }
        try {
          callback(JSON.parse(message))
        } catch (error) {
          this.logger.error(
            'Failed to parse message:',
            error instanceof Error ? error.message : String(error),
          )
        }
      }
    }

    this.calltc.set(callback, callb)
    this.subClient.on('message', callb)
  }

  public async unsubscribe(event: string, callback: (data: any) => void) {
    const channel = this.channelPrefix + event
    this.subClient.unsubscribe(channel)
    const callb = this.calltc.get(callback)
    if (callb) {
      this.subClient.off('message', callb)
      this.calltc.delete(callback)
    }
  }
}

type Callback = (channel: string, message: string) => void

export const redisSubPub = new RedisSubPub()

export type { RedisSubPub }
