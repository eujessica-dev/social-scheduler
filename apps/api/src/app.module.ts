import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { ThrottlerModule } from '@nestjs/throttler'
import { BullModule } from '@nestjs/bull'
import { AuthModule } from './modules/auth/auth.module'
import { OrganizationsModule } from './modules/organizations/organizations.module'
import { BrandsModule } from './modules/brands/brands.module'
import { SocialAccountsModule } from './modules/social-accounts/social-accounts.module'
import { MediaModule } from './modules/media/media.module'
import { PostsModule } from './modules/posts/posts.module'
import { SchedulerModule } from './modules/scheduler/scheduler.module'
import { MetricsModule } from './modules/metrics/metrics.module'
import { BillingModule } from './modules/billing/billing.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),

    ThrottlerModule.forRoot([
      { name: 'short', ttl: 60000, limit: 20 },
      { name: 'long', ttl: 3600000, limit: 300 },
    ]),

    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        redis: config.get<string>('REDIS_URL'),
      }),
      inject: [ConfigService],
    }),

    AuthModule,
    OrganizationsModule,
    BrandsModule,
    SocialAccountsModule,
    MediaModule,
    PostsModule,
    SchedulerModule,
    MetricsModule,
    BillingModule,
  ],
})
export class AppModule {}
