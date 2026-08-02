import { CacheModule as NestCacheModule } from '@nestjs/cache-manager'
import { Global, Module } from '@nestjs/common'
import { CacheService } from './cache.service'
import { RedisConfigService } from './redis.config.service'
import { RedisService } from './redis.service'
import { SubPubService } from './subpub.service'

@Global()
@Module({
  imports: [
    NestCacheModule.registerAsync({
      useClass: RedisConfigService,
      inject: [RedisConfigService],
    }),
  ],
  providers: [RedisConfigService, CacheService, SubPubService, RedisService],
  exports: [CacheService, SubPubService, RedisService],
})
export class RedisModule {}
