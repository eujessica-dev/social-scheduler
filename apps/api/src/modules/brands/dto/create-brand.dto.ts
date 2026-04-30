import { IsString, IsOptional, MinLength, MaxLength, Matches } from 'class-validator'

export class CreateBrandDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string

  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'color deve ser um hex válido (#rrggbb)' })
  color?: string
}
