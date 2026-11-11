import { Injectable } from '@nestjs/common'
import { Logger, createLogger, format, transports } from 'winston'
import type { Logform } from 'winston'
import 'winston-daily-rotate-file'

import { LOG_DIR } from '~/constants/path.constants'

/** Error 默认 JSON.stringify 会变成 {}，这里展开成可读字段 */
const errorReplacer = (_key: string, value: unknown) => {
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack,
    }
  }
  return value
}

/**
 * 单行紧凑格式：时间 [级别] + 单行 JSON
 * 相比原先的 prettyPrint + JSON.stringify(info, null, 2)，
 * 每条日志从十几行压缩成一行，体积约降到 1/3，且便于 grep。
 */
export const compactLogFormat = format.combine(
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  format.printf((info) => {
    const { timestamp, level, ...rest } = info
    const payload = JSON.stringify(rest, errorReplacer)
    return `${timestamp} [${level}] ${payload}`
  }),
) as Logform.Format

@Injectable()
export class LoggerService {
  private context?: string
  private logger: Logger

  public setContext(context: string): void {
    this.context = context
  }

  constructor() {
    /** 日志分割：单个文件超过 20MB 自动切新文件，切出的文件 gzip 压缩保存 */
    const rotateOptions = {
      dirname: LOG_DIR,
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
    } as const

    this.logger = createLogger({
      format: compactLogFormat,
      transports: [
        // new transports.Console(),
        new transports.DailyRotateFile({
          ...rotateOptions,
          filename: '%DATE%.info.log',
          maxFiles: '7d',
          format: compactLogFormat,
          level: 'info',
        }),
        new transports.DailyRotateFile({
          ...rotateOptions,
          filename: '%DATE%.error.log',
          maxFiles: '14d',
          format: compactLogFormat,
          level: 'error',
        }),
      ],
    })
  }

  // 错误日志记录
  error(
    type: string,
    message: string,
    ctx?: any,
    meta?: Record<string, any>,
  ): Logger {
    return this.logger.error({
      type,
      message,
      contextNmae: this.context,
      ctx,
      ...meta,
    })
  }

  // 警告日志记录
  warn(
    type: string,
    message: string,
    ctx?: any,
    meta?: Record<string, any>,
  ): Logger {
    return this.logger.warn({
      type,
      message,
      contextNmae: this.context,
      ctx,
      ...meta,
    })
  }

  // 基本日志记录
  info(
    type: string,
    message: string,
    ctx?: any,
    meta?: Record<string, any>,
  ): Logger {
    return this.logger.info({
      type,
      message,
      contextNmae: this.context,
      ctx,
      ...meta,
    })
  }
}
