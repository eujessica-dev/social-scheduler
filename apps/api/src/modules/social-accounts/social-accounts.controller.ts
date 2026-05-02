import {
  Controller, Get, Delete, Post,
  Param, Query, Res, UseGuards, HttpCode, HttpStatus, Req,
} from '@nestjs/common'
import { Response, Request } from 'express'
import { SocialAccountsService } from './social-accounts.service'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { JwtPayload } from '@social-scheduler/shared'

@Controller('social-accounts')
@UseGuards(JwtAuthGuard)
export class SocialAccountsController {
  constructor(private readonly service: SocialAccountsService) {}

  @Get()
  findAll(@CurrentUser() user: JwtPayload) {
    return this.service.findAll(user)
  }

  // ── Static/named routes MUST come before :id to avoid being swallowed ──────

  @Get('meta/connect')
  connectMeta(@CurrentUser() user: JwtPayload, @Res() res: Response) {
    const url = this.service.buildMetaOAuthUrl(user.organizationId)
    res.redirect(url)
  }

  @Get('meta/callback')
  async metaCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @CurrentUser() user: JwtPayload,
    @Res() res: Response,
  ) {
    await this.service.handleMetaCallback(code, state, user.organizationId)
    res.redirect(`${process.env.FRONTEND_URL}/settings/social-accounts?connected=true`)
  }

  // ── Parameterized routes come last ──────────────────────────────────────────

  @Get(':id')
  findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.service.findOne(user, id)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  disconnect(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.service.disconnect(user, id)
  }
}
