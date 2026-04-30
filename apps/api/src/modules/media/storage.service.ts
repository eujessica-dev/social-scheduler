import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { randomUUID } from 'crypto'
import { join } from 'path'
import { mkdirSync, writeFileSync, unlinkSync, existsSync } from 'fs'

@Injectable()
export class StorageService {
  private readonly logger  = new Logger(StorageService.name)
  private readonly isLocal: boolean
  private readonly uploadsDir: string
  private readonly s3?: S3Client
  private readonly bucket?: string

  constructor(private readonly config: ConfigService) {
    const accessKeyId = config.get<string>('STORAGE_ACCESS_KEY_ID')
    const endpoint    = config.get<string>('STORAGE_ENDPOINT')

    // usa armazenamento local quando não há credenciais S3 configuradas
    this.isLocal = !accessKeyId || !endpoint

    if (this.isLocal) {
      this.uploadsDir = join(process.cwd(), 'uploads')
      if (!existsSync(this.uploadsDir)) mkdirSync(this.uploadsDir, { recursive: true })
      this.logger.warn('Usando armazenamento LOCAL (uploads/). Configure S3/R2 em produção.')
    } else {
      this.s3 = new S3Client({
        region: config.get<string>('STORAGE_REGION') ?? 'auto',
        endpoint: endpoint as string,
        credentials: {
          accessKeyId: accessKeyId as string,
          secretAccessKey: config.get<string>('STORAGE_SECRET_ACCESS_KEY') as string,
        },
      })
      this.bucket = config.get<string>('STORAGE_BUCKET')!
    }
  }

  async upload(
    file: Express.Multer.File,
    organizationId: string,
  ): Promise<{ key: string; url: string }> {
    const ext = file.originalname.split('.').pop()
    const key = `${organizationId}/${randomUUID()}.${ext}`

    if (this.isLocal) {
      const orgDir = join(this.uploadsDir, organizationId)
      if (!existsSync(orgDir)) mkdirSync(orgDir, { recursive: true })
      writeFileSync(join(this.uploadsDir, key), file.buffer)
      const baseUrl = this.config.get<string>('STORAGE_PUBLIC_URL') ?? 'http://localhost:3001/uploads'
      return { key, url: `${baseUrl}/${key}` }
    }

    await this.s3!.send(
      new PutObjectCommand({
        Bucket: this.bucket!,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        Metadata: { organizationId },
      }),
    )

    const publicUrl = this.config.get<string>('STORAGE_PUBLIC_URL')
    return { key, url: `${publicUrl}/${key}` }
  }

  async getSignedUrl(key: string, expiresIn = 3600): Promise<string> {
    if (this.isLocal) {
      const baseUrl = this.config.get<string>('STORAGE_PUBLIC_URL') ?? 'http://localhost:3001/uploads'
      return `${baseUrl}/${key}`
    }

    const command = new GetObjectCommand({ Bucket: this.bucket!, Key: key })
    return getSignedUrl(this.s3!, command, { expiresIn })
  }

  async delete(key: string): Promise<void> {
    if (this.isLocal) {
      const filePath = join(this.uploadsDir, key)
      if (existsSync(filePath)) unlinkSync(filePath)
      return
    }

    await this.s3!.send(new DeleteObjectCommand({ Bucket: this.bucket!, Key: key }))
  }
}
