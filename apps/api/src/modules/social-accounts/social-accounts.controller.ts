import {
  Controller, Get, Delete, Post,
  Param, Query, Body, Res, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common'
import { Response } from 'express'
import { SocialAccountsService } from './social-accounts.service'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { Public } from '../../common/decorators/public.decorator'
import { JwtPayload } from '@social-scheduler/shared'

@Controller('social-accounts')
@UseGuards(JwtAuthGuard)
export class SocialAccountsController {
  constructor(private readonly service: SocialAccountsService) {}

  @Get()
  findAll(@CurrentUser() user: JwtPayload) {
    return this.service.findAll(user)
  }

  // ── Meta OAuth ── passo 1: retorna URL (requer JWT) ──────────────
  // O frontend chama via axios e então faz window.location.href = url
  @Get('meta/connect')
  connectMeta(@CurrentUser() user: JwtPayload) {
    const url = this.service.buildMetaOAuthUrl(user.organizationId)
    return { url }
  }

  // ── Meta OAuth ── passo 2: callback (PUBLIC) ─────────────────────
  // Meta redireciona aqui após o usuário autorizar; não usa JWT
  @Public()
  @Get('meta/callback')
  async metaCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    try {
      const redirectUrl = await this.service.handleMetaCallback(code, state)
      res.redirect(redirectUrl)
    } catch (err: any) {
      const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000'
      res.redirect(`${frontendUrl}/connect/select?error=${encodeURIComponent(err.message ?? 'Erro desconhecido')}`)
    }
  }

  // ── Meta OAuth ── passo 3: busca contas pendentes (PUBLIC) ────────
  @Public()
  @Get('meta/pending/:token')
  getPending(@Param('token') token: string) {
    return this.service.getPendingAccounts(token)
  }

  // ── Meta OAuth ── passo 4: finalizar seleção (requer JWT) ─────────
  @Post('meta/finalize')
  @HttpCode(HttpStatus.OK)
  finalize(
    @CurrentUser() user: JwtPayload,
    @Body() body: { token: string; platformUserId: string },
  ) {
    return this.service.finalizeConnection(user, body.token, body.platformUserId)
  }

  // ── Parameterized routes por último ──────────────────────────────

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
