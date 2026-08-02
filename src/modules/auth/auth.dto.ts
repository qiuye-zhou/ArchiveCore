import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator'

export class LoginDto {
  @IsString()
  @IsNotEmpty()
  username!: string

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password!: string
}

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  username!: string

  @IsEmail()
  @IsNotEmpty()
  email!: string

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password!: string

  @IsString()
  @IsOptional()
  avatar?: string
}

export class RefreshTokenDto {
  @IsString()
  @IsNotEmpty()
  token!: string
}

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty()
  oldPassword!: string

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  newPassword!: string
}
