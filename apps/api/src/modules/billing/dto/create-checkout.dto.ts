import { IsString, IsIn } from 'class-validator'

export class CreateCheckoutDto {
  @IsString()
  @IsIn(['starter', 'pro', 'agency'])
  plan: string

  @IsString()
  @IsIn(['stripe', 'asaas', 'mercadopago'])
  gateway: string
}
