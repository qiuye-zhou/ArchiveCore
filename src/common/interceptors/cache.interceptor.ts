/**
 * HttpCache interceptor.
 * @file 缓存拦截器
 * @class HttpCacheInterceptor
 */
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { Observable, of } from 'rxjs'
import { tap, catchError } from 'rxjs/operators'

import { REDIS } from '~/app.config'
import { API_CACHE_PREFIX } from '~/constants/cache.constants'
import { HTTP_CACHE_DISABLE } from '~/constants/meta.constants'
import { isTest } from '~/global/env.global'
import { LoggerService } from '~/processors/logger/logger.service'
import { CacheService } from '~/processors/redis/cache.service'

@Injectable()
export class HttpCacheInterceptor implements NestInterceptor {
  constructor(
    private readonly cacheManager: CacheService,
    private readonly logger: LoggerService,
    private readonly reflector: Reflector,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    if (REDIS.disableApiCache && !isTest) {
      return next.handle()
    }

    const request = context.switchToHttp().getRequest()
    if (request.method.toLowerCase() !== 'get') {
      return next.handle()
    }

    const isDisable = this.reflector.get(
      HTTP_CACHE_DISABLE,
      context.getHandler(),
    )
    if (isDisable) {
      return next.handle()
    }

    const key = `${API_CACHE_PREFIX}${request.url}`
    const ttl = REDIS.httpCacheTTL

    try {
      const value = await this.cacheManager.get(key)

      if (value) {
        this.logger.info('cache', `hit cache:${key}`, value)
        return of(value)
      }

      return next.handle().pipe(
        tap((response) => {
          if (response) {
            this.cacheManager.set(key, response, ttl * 1000)
          }
        }),
        catchError((error) => {
          this.logger.info('cache', `cache error`, error)
          throw error
        }),
      )
    } catch (error) {
      this.logger.info('cache', `cache error`, error)
      return next.handle()
    }
  }
}
