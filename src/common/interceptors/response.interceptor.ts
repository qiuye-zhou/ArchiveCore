import {
  CallHandler,
  Injectable,
  NestInterceptor,
  ExecutionContext,
} from '@nestjs/common'
import { map, type Observable } from 'rxjs'

import { getInfoFromReq } from '~/utils/getInfoFromReq.util'
import { LoggerService } from '~/processors/logger/logger.service'

/** 响应体记入日志的最大字符数，超出只记摘要，避免大响应把日志刷爆 */
const MAX_RESPONSE_LOG_CHARS = 2000

/** 读取/下载日志文件的接口：响应体就是日志全文，直接跳过记录 */
const LOG_CONTENT_PATH = /^\/health\/log\/[^/]+/

/** 生成响应体摘要：小响应原样记录，大响应只保留长度和预览 */
function summarizeForLog(data: unknown): unknown {
  if (data === null || data === undefined) return data
  let serialized: string
  try {
    serialized = JSON.stringify(data) ?? ''
  } catch {
    return '[无法序列化]'
  }
  if (serialized.length <= MAX_RESPONSE_LOG_CHARS) return data
  return {
    truncated: true,
    originalLength: serialized.length,
    preview: `${serialized.slice(0, MAX_RESPONSE_LOG_CHARS)}…`,
  }
}

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  constructor(private readonly logger: LoggerService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest()
    const path: string = request.path ?? request.url ?? ''

    return next.handle().pipe(
      map((data) => {
        this.logger.info(
          'response interceptor',
          'response',
          {
            code: 200,
            // 读日志接口会把整份日志内容再写回日志，形成自我放大，这里只留标记
            responseData: LOG_CONTENT_PATH.test(path)
              ? '[已跳过：日志文件内容]'
              : summarizeForLog(data),
            req: getInfoFromReq(request),
          },
        )
        return {
          code: 200,
          data,
        }
      }),
    )
  }
}
