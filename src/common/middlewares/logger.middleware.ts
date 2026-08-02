import { Injectable, NestMiddleware } from '@nestjs/common'
import { Request, Response, NextFunction } from 'express'

import { getInfoFromReq } from '~/utils/getInfoFromReq.util'
import { LoggerService } from '~/processors/logger/logger.service'

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  constructor(private readonly logger: LoggerService) {}
  use(req: Request, res: Response, next: NextFunction) {
    const { body, ...reqInfo } = getInfoFromReq(req)
    const sanitizedBody = this.sanitizeBody(body)
    this.logger.info('route', 'route', {
      req: { ...reqInfo, body: sanitizedBody },
    })
    next()
  }

  private sanitizeBody(
    body: Record<string, any> | undefined,
  ): Record<string, any> | undefined {
    if (!body) return undefined
    const sanitized = { ...body }
    const sensitiveFields = [
      'password',
      'token',
      'secret',
      'apiKey',
      'api_key',
      'authorization',
    ]
    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '***REDACTED***'
      }
    }
    return sanitized
  }
}
