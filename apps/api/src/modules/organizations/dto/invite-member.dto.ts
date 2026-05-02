import { IsEmail, IsString, IsIn } from 'class-validator'

export class InviteMemberDto {
  @IsEmail({}, { message: 'E-mail inválido' })
  email: string

  @IsString()
  @IsIn(['admin', 'editor', 'client', 'finance', 'readonly'])
  role: string
}
