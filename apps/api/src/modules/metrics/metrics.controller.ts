import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common'
import { MetricsService } from './metrics.service'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { JwtPayload } from '@social-scheduler/shared'

@Controller('metrics')
@UseGuards(JwtAuthGuard)
export class MetricsController {
  constructor(private readonly metrics: MetricsService) {}

  @Get('dashboard')
  dashboard(@CurrentUser() user: JwtPayload) {
    return this.metrics.getDashboard(user)
  }

  @Get('history')
  history(@CurrentUser() user: JwtPayload, @Query('limit') limit?: string): Promise<any> {
    return this.metrics.getPublishingHistory(user, limit ? parseInt(limit) : 20)
  }

  @Get('accounts/:accountId')
  accountMetrics(@CurrentUser() user: JwtPayload, @Param('accountId') accountId: string): Promise<any> {
    return this.metrics.getAccountMetrics(user, accountId)
  }

  @Get('posts/:postId')
  postMetrics(@CurrentUser() user: JwtPayload, @Param('postId') postId: string): Promise<any> {
    return this.metrics.getPostMetrics(user, postId)
  }
}
