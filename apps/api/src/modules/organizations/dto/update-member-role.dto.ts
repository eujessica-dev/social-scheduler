import { IsString, IsIn } from 'class-validator'

export class UpdateMemberRoleDto {
  @IsString()
  @IsIn(['owner', 'admin', 'editor', 'client', 'finance', 'readonly'])
  role: string
}
