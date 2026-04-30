import { Module } from '@nestjs/common'
import { BullModule } from '@nestjs/bull'
import { MetricsController } from './metrics.controller'
import { MetricsService } from './metrics.service'
import { PrismaService } from '../../config/prisma.service'
import { SocialAccountsModule } from '../social-accounts/social-accounts.module'
import { QUEUE_NAMES } from '@social-scheduler/shared'

@Module({
  imports: [
    BullModule.registerQueue({ name: QUEUE_NAMES.METRICS }),
    SocialAccountsModule,
  ],
  controllers: [MetricsController],
  providers: [MetricsService, PrismaService],
  exports: [MetricsService],
})
export class MetricsModule {}
