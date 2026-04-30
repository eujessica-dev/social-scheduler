import { IsString, IsOptional, IsBoolean, MinLength, MaxLength } from 'class-validator'

export class AddCommentDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  text: string

  @IsString()
  @MaxLength(100)
  authorName: string

  @IsOptional()
  @IsBoolean()
  isInternal?: boolean
}
