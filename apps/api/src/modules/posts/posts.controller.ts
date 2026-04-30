import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common'
import { PostsService } from './posts.service'
import { CreatePostDto } from './dto/create-post.dto'
import { UpdatePostDto } from './dto/update-post.dto'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { JwtPayload } from '@social-scheduler/shared'

@Controller('posts')
@UseGuards(JwtAuthGuard)
export class PostsController {
  constructor(private readonly posts: PostsService) {}

  @Get()
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query('brandId') brandId?: string,
    @Query('status') status?: string,
  ) {
    return this.posts.findAll(user, { brandId, status })
  }

  @Get(':id')
  findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.posts.findOne(user, id)
  }

  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreatePostDto) {
    return this.posts.create(user, dto)
  }

  @Patch(':id')
  update(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: UpdatePostDto) {
    return this.posts.update(user, id, dto)
  }

  @Patch(':id/approve')
  approve(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.posts.approve(user, id)
  }

  @Patch(':id/cancel')
  cancel(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.posts.cancel(user, id)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.posts.remove(user, id)
  }
}
