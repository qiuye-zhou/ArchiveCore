import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common'
import { Emitter } from '@socket.io/redis-emitter'
import { REDIS } from '~/app.config'
import { getRedisKey } from '~/utils/redis.util'
import IORedis from 'ioredis'
import { API_CACHE_PREFIX } from '~/constants/cache.constants'

export const RedisIoAdapterKey = 'qy-core-socket'

@Injectable()
export class RedisService implements OnModuleDestroy {
  private redisClient: IORedis
  private readonly logger = new Logger(RedisService.name)
  private _emitter: Emitter | null = null

  constructor() {
    this.redisClient = new IORedis({
      host: REDIS.host,
      port: REDIS.port,
      password: REDIS.password,
      retryStrategy: (times: number) => {
        if (times > 3) {
          this.logger.error('Redis connection failed after 3 retries')
          return null
        }
        return Math.min(times * 100, 3000)
      },
    })

    this.redisClient.on('error', (err) => {
      this.logger.error('Redis connection error:', err.message)
    })

    this.redisClient.on('connect', () => {
      this.logger.log('Redis connected successfully')
    })
  }

  public getClient() {
    return this.redisClient
  }

  public get emitter(): Emitter {
    if (this._emitter) {
      return this._emitter
    }
    this._emitter = new Emitter(this.redisClient, {
      key: RedisIoAdapterKey,
    })

    return this._emitter
  }

  private async scanKeys(pattern: string): Promise<string[]> {
    const keys: string[] = []
    let cursor = '0'
    do {
      const [nextCursor, foundKeys] = await this.redisClient.scan(
        cursor,
        'MATCH',
        pattern,
        'COUNT',
        100,
      )
      cursor = nextCursor
      keys.push(...foundKeys)
    } while (cursor !== '0')
    return keys
  }

  public async cleanCatch() {
    const keys = await this.scanKeys(`${API_CACHE_PREFIX}*`)
    if (keys.length > 0) {
      await Promise.all(keys.map((key) => this.redisClient.del(key)))
    }
  }

  public async cleanKey(key: string) {
    await this.redisClient.del(key)
  }

  public async cleanAllRedisKey() {
    const keys = await this.scanKeys(getRedisKey('*'))
    if (keys.length > 0) {
      await Promise.all(keys.map((key) => this.redisClient.del(key)))
    }
  }

  async onModuleDestroy() {
    await this.redisClient.quit()
    this.logger.log('Redis connection closed')
  }
}
