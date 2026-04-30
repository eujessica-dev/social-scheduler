import { Module } from '@nestjs/common'
import { MediaController } from './media.controller'
import { MediaService } from './media.service'
import { StorageService } from './storage.service'
import { PrismaService } from '../../config/prisma.service'

@Module({
  controllers: [MediaController],
  providers: [MediaService, StorageService, PrismaService],
  exports: [MediaService, StorageService],
})
export class MediaModule {}
