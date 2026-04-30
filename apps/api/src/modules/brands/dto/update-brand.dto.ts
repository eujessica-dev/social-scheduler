import { IsString, IsOptional, MinLength, MaxLength, Matches, IsUrl } from 'class-validator'

export class UpdateBrandDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string

  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'color deve ser um hex válido (#rrggbb)' })
  color?: string

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string

  @IsOptional()
  @IsUrl({}, { message: 'website deve ser uma URL válida' })
  website?: string
}
