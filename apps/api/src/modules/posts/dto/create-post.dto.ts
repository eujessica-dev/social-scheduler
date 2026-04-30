import {
  IsString, IsOptional, IsArray, IsDateString,
  IsUUID, MinLength, MaxLength, ArrayNotEmpty,
} from 'class-validator'

export class CreatePostDto {
  @IsUUID()
  brandId: string

  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string

  @IsOptional()
  @IsString()
  @MaxLength(2200)
  caption?: string

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  hashtags?: string[]

  @IsOptional()
  @IsDateString()
  scheduledAt?: string

  @IsOptional()
  @IsString()
  timezone?: string

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string

  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  mediaAssetIds?: string[]

  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('all', { each: true })
  socialAccountIds: string[]
}
