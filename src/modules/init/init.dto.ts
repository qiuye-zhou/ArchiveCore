import { IsArray, IsObject, IsOptional, IsString } from 'class-validator'

class InitSeoDto {
  @IsString()
  @IsOptional()
  title?: string

  @IsArray()
  @IsOptional()
  keywords?: string[]

  @IsString()
  @IsOptional()
  description?: string
}

class InitUrlDto {
  @IsString()
  @IsOptional()
  webUrl?: string

  @IsString()
  @IsOptional()
  adminUrl?: string

  @IsString()
  @IsOptional()
  serverUrl?: string

  @IsString()
  @IsOptional()
  gatewayUrl?: string
}

export class InitConfigDto {
  @IsObject()
  @IsOptional()
  seo?: InitSeoDto

  @IsObject()
  @IsOptional()
  url?: InitUrlDto
}

export class InitMasterBodyDto {
  @IsString()
  username: string

  @IsString()
  name: string

  @IsString()
  password: string

  @IsString()
  @IsOptional()
  introduce?: string

  @IsString()
  @IsOptional()
  avatar?: string

  @IsObject()
  @IsOptional()
  config?: InitConfigDto
}
