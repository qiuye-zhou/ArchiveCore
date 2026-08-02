import { BadRequestException, Body, Controller, Post } from '@nestjs/common'

import { AuthService } from './auth.service'
import { RefreshTokenDto } from './auth.dto'

@Controller({ path: 'auth' })
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('/refresh')
  async refreshToken(@Body() refreshTokenDto: RefreshTokenDto) {
    const userId = await this.authService.verifytoken(refreshTokenDto.token)
    if (!userId) {
      throw new BadRequestException('无效的 token')
    }

    const newToken = await this.authService.signtoken(userId)
    await this.authService.jwtServicePublic.revokeToken(refreshTokenDto.token)
    return {
      token: newToken,
    }
  }
}
