import {
  IsString, IsOptional, MaxLength, IsArray, IsUUID,
} from 'class-validator'

export class CreateCreativeDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string

  @IsOptional()
  @IsString()
  caption?: string

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  hashtags?: string[]

  @IsOptional()
  @IsString()
  notes?: string

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  mediaAssetIds?: string[]
}
