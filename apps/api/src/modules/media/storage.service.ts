import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { randomUUID } from 'crypto'

@Injectable()
export class StorageService {
  private readonly s3: S3Client
  private readonly bucket: string

  constructor(private readonly config: ConfigService) {
    this.s3 = new S3Client({
      region: config.get<string>('STORAGE_REGION') ?? 'auto',
      endpoint: config.get<string>('STORAGE_ENDPOINT'),
      credentials: {
        accessKeyId: config.get<string>('STORAGE_ACCESS_KEY_ID')!,
        secretAccessKey: config.get<string>('STORAGE_SECRET_ACCESS_KEY')!,
      },
    })
    this.bucket = config.get<string>('STORAGE_BUCKET')!
  }

  async upload(
    file: Express.Multer.File,
    organizationId: string,
  ): Promise<{ key: string; url: string }> {
    const ext = file.originalname.split('.').pop()
    const key = `${organizationId}/${randomUUID()}.${ext}`

    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
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
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: key })
    return getSignedUrl(this.s3, command, { expiresIn })
  }

  async delete(key: string): Promise<void> {
    await this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }))
  }
}
