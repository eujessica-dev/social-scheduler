import { Module } from '@nestjs/common'
import { CreativesController, ApprovalsController } from './creatives.controller'
import { CreativesService } from './creatives.service'
import { PrismaService } from '../../config/prisma.service'
import { StorageService } from '../media/storage.service'

@Module({
  controllers: [CreativesController, ApprovalsController],
  providers: [CreativesService, PrismaService, StorageService],
  exports: [CreativesService],
})
export class CreativesModule {}
