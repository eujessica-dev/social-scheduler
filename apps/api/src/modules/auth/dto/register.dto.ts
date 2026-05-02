import { IsEmail, IsString, MinLength, MaxLength, IsOptional, IsBoolean, Matches } from 'class-validator'

export class RegisterDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string

  @IsEmail()
  email: string

  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password: string

  @IsOptional()
  @IsString()
  @Matches(/^\+?[1-9]\d{6,14}$/, { message: 'Telefone inválido' })
  phone?: string

  @IsOptional()
  @IsBoolean()
  whatsappOptIn?: boolean
}
