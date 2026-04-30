import { Module } from '@nestjs/common'
import { BullModule } from '@nestjs/bull'
import { PublishingProcessor } from './publishing.processor'
import { PrismaService } from '../../config/prisma.service'
import { SocialAccountsModule } from '../social-accounts/social-accounts.module'
import { QUEUE_NAMES } from '@social-scheduler/shared'

@Module({
  imports: [
    BullModule.registerQueue({ name: QUEUE_NAMES.PUBLISHING }),
    SocialAccountsModule,
  ],
  providers: [PublishingProcessor, PrismaService],
})
export class SchedulerModule {}
