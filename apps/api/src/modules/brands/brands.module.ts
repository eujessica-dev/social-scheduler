import { Module } from '@nestjs/common'
import { BrandsController } from './brands.controller'
import { BrandsService } from './brands.service'
import { PrismaService } from '../../config/prisma.service'
import { StorageService } from '../media/storage.service'

@Module({
  controllers: [BrandsController],
  providers: [BrandsService, PrismaService, StorageService],
  exports: [BrandsService],
})
export class BrandsModule {}
