import { IsString, IsOptional, MaxLength } from 'class-validator'

export class ResolveApprovalDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  feedback?: string

  @IsOptional()
  @IsString()
  @MaxLength(100)
  clientName?: string
}
