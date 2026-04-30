import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { NestExpressApplication } from '@nestjs/platform-express'
import { AppModule } from './app.module'
import * as cookieParser from 'cookie-parser'
import helmet from 'helmet'
import { join } from 'path'
import { existsSync, mkdirSync } from 'fs'

// BigInt não é serializável por padrão no JSON — converte para string
;(BigInt.prototype as any).toJSON = function () { return Number(this) }

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule)

  // serve uploads locais (usado em dev sem S3)
  const uploadsDir = join(process.cwd(), 'uploads')
  if (!existsSync(uploadsDir)) mkdirSync(uploadsDir, { recursive: true })
  app.useStaticAssets(uploadsDir, { prefix: '/uploads' })

  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }))
  app.use(cookieParser())

  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )

  app.setGlobalPrefix('api/v1')

  const port = process.env.PORT ?? 3001
  await app.listen(port)
  console.log(`API rodando em http://localhost:${port}/api/v1`)
}

bootstrap()
