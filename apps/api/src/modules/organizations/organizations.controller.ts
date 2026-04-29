import { Controller, Get, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common'
import { OrganizationsService } from './organizations.service'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { JwtPayload } from '@social-scheduler/shared'

@Controller('organizations')
@UseGuards(JwtAuthGuard)
export class OrganizationsController {
  constructor(private readonly orgs: OrganizationsService) {}

  @Get('me')
  getMyOrg(@CurrentUser() user: JwtPayload) {
    return this.orgs.getMyOrganization(user)
  }

  @Patch('me')
  updateOrg(@CurrentUser() user: JwtPayload, @Body() body: { name?: string }) {
    return this.orgs.updateOrganization(user, body)
  }

  @Get('me/members')
  getMembers(@CurrentUser() user: JwtPayload) {
    return this.orgs.getMembers(user)
  }

  @Patch('me/members/:memberId/role')
  updateRole(
    @CurrentUser() user: JwtPayload,
    @Param('memberId') memberId: string,
    @Body() body: { role: string },
  ) {
    return this.orgs.updateMemberRole(user, memberId, body.role)
  }

  @Delete('me/members/:memberId')
  removeMember(@CurrentUser() user: JwtPayload, @Param('memberId') memberId: string) {
    return this.orgs.removeMember(user, memberId)
  }
}
