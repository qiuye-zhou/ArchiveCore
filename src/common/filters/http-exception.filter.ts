import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common'

import { getInfoFromReq } from '~/utils/getInfoFromReq.util'
import { LoggerService } from '~/processors/logger/logger.service'
import { isDev } from '~/global/env.global'

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: LoggerService) {}
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse()
    const request = ctx.getRequest()

    let status: number
    let message: string | string[]

    if (exception instanceof HttpException) {
      status = exception.getStatus()
      const res = exception.getResponse()
      if (typeof res === 'object' && res !== null) {
        const responseObj = res as Record<string, unknown>
        message =
          (responseObj.message as string | string[]) || exception.message
      } else {
        message = exception.message
      }
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR
      message = isDev
        ? exception instanceof Error
          ? exception.message
          : String(exception)
        : '服务器内部错误'

      Logger.error(
        'Unexpected error',
        exception instanceof Error ? exception.stack : String(exception),
        'HttpExceptionFilter',
      )
    }

    this.logger.error(
      'filter',
      Array.isArray(message) ? message.join(', ') : message,
      {
        code: status,
        req: getInfoFromReq(request),
      },
    )

    response.status(status).type('application/json').send({
      code: status,
      message,
    })
  }
}
