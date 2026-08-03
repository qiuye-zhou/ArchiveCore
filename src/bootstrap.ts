import { NestFactory } from '@nestjs/core'
import { Logger } from '@nestjs/common'

import { PORT, CROSS_LIST } from './app.config'
import { AppModule } from './app.module'
import { RedisIoAdapter } from './constants/socket.adapter'
import { ExtendedValidationPipe } from './common/pipes/validation.pipe'

import helmet from 'helmet'
import rateLimit from 'express-rate-limit'

const origin: false | string[] = Array.isArray(CROSS_LIST) ? CROSS_LIST : false

export async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  // Security headers
  app.use(helmet())

  // Rate limiting: 300 requests per 15 minutes per IP
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 300,
      standardHeaders: true,
      legacyHeaders: false,
      message: { code: 429, message: '请求过于频繁，请稍后再试' },
    }),
  )

  app.enableCors({
    allowedHeaders: ['content-type', 'authorization'],
    origin: origin,
    credentials: true,
  })
  app.useGlobalPipes(ExtendedValidationPipe.shared)
  app.useWebSocketAdapter(new RedisIoAdapter(app))

  await app.listen(PORT, async () => {
    const url = await app.getUrl()
    Logger.log(`ENV: ${process.env.NODE_ENV}`, 'bootstrap')
    Logger.log(`Server listen on: ${url}`, 'bootstrap')
    Logger.log(`Server started with port ${PORT}`, 'bootstrap')
  })
}
