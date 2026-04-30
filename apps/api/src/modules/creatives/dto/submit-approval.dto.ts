import { IsString, IsOptional, IsEmail, IsDateString } from 'class-validator'

export class SubmitApprovalDto {
  @IsOptional()
  @IsString()
  clientName?: string

  @IsOptional()
  @IsEmail()
  clientEmail?: string

  @IsOptional()
  @IsDateString()
  expiresAt?: string
}
