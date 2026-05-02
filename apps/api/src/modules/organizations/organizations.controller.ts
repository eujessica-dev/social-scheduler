import { Controller, Get, Patch, Delete, Post, Body, Param, UseGuards, HttpCode, HttpStatus } from '@nestjs/common'
import { OrganizationsService } from './organizations.service'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { JwtPayload } from '@social-scheduler/shared'
import { UpdateOrganizationDto } from './dto/update-organization.dto'
import { UpdateMemberRoleDto } from './dto/update-member-role.dto'
import { InviteMemberDto } from './dto/invite-member.dto'

@Controller('organizations')
@UseGuards(JwtAuthGuard)
export class OrganizationsController {
  constructor(private readonly orgs: OrganizationsService) {}

  @Get('me')
  getMyOrg(@CurrentUser() user: JwtPayload) {
    return this.orgs.getMyOrganization(user)
  }

  @Patch('me')
  updateOrg(@CurrentUser() user: JwtPayload, @Body() dto: UpdateOrganizationDto) {
    return this.orgs.updateOrganization(user, dto)
  }

  @Get('me/members')
  getMembers(@CurrentUser() user: JwtPayload) {
    return this.orgs.getMembers(user)
  }

  @Patch('me/members/:memberId/role')
  updateRole(
    @CurrentUser() user: JwtPayload,
    @Param('memberId') memberId: string,
    @Body() dto: UpdateMemberRoleDto,
  ) {
    return this.orgs.updateMemberRole(user, memberId, dto.role)
  }

  @Post('me/invite')
  @HttpCode(HttpStatus.CREATED)
  inviteMember(
    @CurrentUser() user: JwtPayload,
    @Body() dto: InviteMemberDto,
  ) {
    return this.orgs.inviteMember(user, dto.email, dto.role)
  }

  @Delete('me/members/:memberId')
  removeMember(@CurrentUser() user: JwtPayload, @Param('memberId') memberId: string) {
    return this.orgs.removeMember(user, memberId)
  }
}
