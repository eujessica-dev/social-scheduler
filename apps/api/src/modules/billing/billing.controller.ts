import {
  Controller, Get, Post, Body, Param,
  UseGuards, HttpCode, HttpStatus, Req, Headers,
} from '@nestjs/common'
import { Request } from 'express'
import { BillingService } from './billing.service'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { JwtPayload } from '@social-scheduler/shared'
import { CreateCheckoutDto } from './dto/create-checkout.dto'

@Controller('billing')
export class BillingController {
  constructor(private readonly billing: BillingService) {}

  @Get('subscription')
  @UseGuards(JwtAuthGuard)
  getSubscription(@CurrentUser() user: JwtPayload) {
    return this.billing.getSubscription(user)
  }

  @Post('checkout')
  @UseGuards(JwtAuthGuard)
  createCheckout(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateCheckoutDto,
  ) {
    return this.billing.createCheckout(user, dto.plan, dto.gateway)
  }

  @Post('cancel')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  cancel(@CurrentUser() user: JwtPayload) {
    return this.billing.cancelSubscription(user)
  }

  // Webhooks públicos (sem JWT — autenticados pela assinatura do gateway)
  @Post('webhook/:gateway')
  @HttpCode(HttpStatus.OK)
  webhook(
    @Param('gateway') gateway: string,
    @Req() req: Request,
    @Headers('stripe-signature') stripeSignature?: string,
  ) {
    return this.billing.handleWebhook(gateway, req.body, stripeSignature)
  }
}
