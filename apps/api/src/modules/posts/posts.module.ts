import { Module } from '@nestjs/common'
import { BullModule } from '@nestjs/bull'
import { PostsController } from './posts.controller'
import { PostsService } from './posts.service'
import { PrismaService } from '../../config/prisma.service'
import { StorageService } from '../media/storage.service'
import { QUEUE_NAMES } from '@social-scheduler/shared'

@Module({
  imports: [
    BullModule.registerQueue({ name: QUEUE_NAMES.PUBLISHING }),
  ],
  controllers: [PostsController],
  providers: [PostsService, PrismaService, StorageService],
  exports: [PostsService],
})
export class PostsModule {}
