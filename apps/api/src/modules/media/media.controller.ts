import {
  Controller, Get, Post, Delete,
  Param, Query, UseGuards, UseInterceptors,
  UploadedFile, HttpCode, HttpStatus, ParseFilePipe, MaxFileSizeValidator,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { memoryStorage } from 'multer'
import { MediaService } from './media.service'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { JwtPayload } from '@social-scheduler/shared'

@Controller('media')
@UseGuards(JwtAuthGuard)
export class MediaController {
  constructor(private readonly media: MediaService) {}

  @Get()
  findAll(@CurrentUser() user: JwtPayload, @Query('brandId') brandId?: string) {
    return this.media.findAll(user, brandId)
  }

  @Get(':id')
  findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.media.findOne(user, id)
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  upload(
    @CurrentUser() user: JwtPayload,
    @UploadedFile() file: Express.Multer.File,
    @Query('brandId') brandId?: string,
  ) {
    return this.media.upload(user, file, brandId)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.media.remove(user, id)
  }
}
