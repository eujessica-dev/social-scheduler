import { Module } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { SocialAccountsController } from './social-accounts.controller'
import { SocialAccountsService } from './social-accounts.service'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { PrismaService } from '../../config/prisma.service'

@Module({
  controllers: [SocialAccountsController],
  providers: [SocialAccountsService, PrismaService, JwtAuthGuard, Reflector],
  exports: [SocialAccountsService],
})
export class SocialAccountsModule {}
