import { IoAdapter } from '@nestjs/platform-socket.io'
import { createAdapter } from '@socket.io/redis-adapter'
import IORedis from 'ioredis'
import { Logger } from '@nestjs/common'

import { REDIS } from '~/app.config'

export const RedisIoAdapterKey = 'archive-core-socket'

export class RedisIoAdapter extends IoAdapter {
  private pubClient: IORedis | null = null
  private subClient: IORedis | null = null
  private readonly logger = new Logger(RedisIoAdapter.name)

  createIOServer(port: number, options?: any) {
    const server = super.createIOServer(port, options)

    this.pubClient = new IORedis({
      host: REDIS.host,
      port: REDIS.port,
      password: REDIS.password,
    })
    this.subClient = this.pubClient.duplicate()

    const redisAdapter = createAdapter(this.pubClient, this.subClient, {
      key: RedisIoAdapterKey,
      requestsTimeout: 10000,
    })
    server.adapter(redisAdapter)
    return server
  }

  async close() {
    try {
      if (this.pubClient) {
        await this.pubClient.quit()
        this.pubClient = null
      }
      if (this.subClient) {
        await this.subClient.quit()
        this.subClient = null
      }
      this.logger.log('Redis adapter connections closed')
    } catch (error) {
      this.logger.error('Error closing Redis adapter connections', error)
    }
  }
}
