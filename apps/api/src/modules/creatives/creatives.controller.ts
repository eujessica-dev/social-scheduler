import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common'
import { CreativesService } from './creatives.service'
import { CreateCreativeDto } from './dto/create-creative.dto'
import { UpdateCreativeDto } from './dto/update-creative.dto'
import { SubmitApprovalDto } from './dto/submit-approval.dto'
import { AddCommentDto } from './dto/add-comment.dto'
import { ResolveApprovalDto } from './dto/resolve-approval.dto'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { JwtPayload } from '@social-scheduler/shared'

// ─── Authenticated routes ──────────────────────────────────────────────────────

@Controller()
@UseGuards(JwtAuthGuard)
export class CreativesController {
  constructor(private readonly creatives: CreativesService) {}

  // GET  /brands/:brandId/creatives
  @Get('brands/:brandId/creatives')
  findAll(@CurrentUser() user: JwtPayload, @Param('brandId') brandId: string) {
    return this.creatives.findAllByBrand(user, brandId)
  }

  // GET  /creatives/:id
  @Get('creatives/:id')
  findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.creatives.findOne(user, id)
  }

  // POST /brands/:brandId/creatives
  @Post('brands/:brandId/creatives')
  create(
    @CurrentUser() user: JwtPayload,
    @Param('brandId') brandId: string,
    @Body() dto: CreateCreativeDto,
  ) {
    return this.creatives.create(user, brandId, dto)
  }

  // PATCH /creatives/:id
  @Patch('creatives/:id')
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateCreativeDto,
  ) {
    return this.creatives.update(user, id, dto)
  }

  // DELETE /creatives/:id
  @Delete('creatives/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.creatives.remove(user, id)
  }

  // POST /creatives/:id/submit
  @Post('creatives/:id/submit')
  submitForApproval(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: SubmitApprovalDto,
  ) {
    return this.creatives.submitForApproval(user, id, dto)
  }

  // POST /creatives/:id/ai-enhance
  @Post('creatives/:id/ai-enhance')
  aiEnhance(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body('prompt') prompt: string,
  ) {
    return this.creatives.aiEnhance(user, id, prompt ?? '')
  }
}

// ─── Public (no-auth) approval routes ─────────────────────────────────────────

@Controller('approvals')
export class ApprovalsController {
  constructor(private readonly creatives: CreativesService) {}

  // GET  /approvals/:token
  @Get(':token')
  getApproval(@Param('token') token: string) {
    return this.creatives.getApprovalByToken(token)
  }

  // POST /approvals/:token/comments
  @Post(':token/comments')
  addComment(@Param('token') token: string, @Body() dto: AddCommentDto) {
    return this.creatives.addComment(token, dto)
  }

  // POST /approvals/:token/approve
  @Post(':token/approve')
  approve(@Param('token') token: string, @Body() dto: ResolveApprovalDto) {
    return this.creatives.approveByToken(token, dto)
  }

  // POST /approvals/:token/reject
  @Post(':token/reject')
  reject(@Param('token') token: string, @Body() dto: ResolveApprovalDto) {
    return this.creatives.rejectByToken(token, dto)
  }
}
