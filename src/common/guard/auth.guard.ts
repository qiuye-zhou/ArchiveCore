import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import { isJWT } from 'class-validator'

import { AuthService } from '~/modules/auth/auth.service'
import { UserModel } from '~/modules/user/user.model'
import { RequestBizRequest } from '~/transformers/get-req.transformer'
import { UserService } from '~/modules/user/user.service'

/**
 * JWT auth guard
 */

@Injectable()
export class AuthGuard implements CanActivate {
  private cachedMaster: UserModel | null = null
  private cacheExpiry = 0
  private readonly CACHE_TTL = 60_000 // 1 minute

  constructor(
    protected readonly authService: AuthService,
    protected readonly userService: UserService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<any> {
    const request = context.switchToHttp().getRequest()
    const query = request.query as any
    const headers = request.headers
    const rawAuthorization: string =
      headers.authorization || headers.Authorization || query.token

    if (!rawAuthorization) {
      throw new UnauthorizedException('未登录')
    }

    // 兼容标准 Bearer 前缀：Authorization: Bearer <token>
    const token = rawAuthorization.startsWith('Bearer ')
      ? rawAuthorization.slice(7).trim()
      : rawAuthorization

    if (!isJWT(token)) {
      throw new UnauthorizedException('令牌无效')
    }

    const result = await this.authService.jwtServicePublic.verify(token)
    if (!result) {
      throw new UnauthorizedException('身份过期')
    }

    const user = await this.getCachedMaster()
    this.attachUserAndToken(request, user, token)
    return true
  }

  private async getCachedMaster(): Promise<UserModel> {
    const now = Date.now()
    if (this.cachedMaster && now < this.cacheExpiry) {
      return this.cachedMaster
    }
    const user = await this.userService.getMaster()
    this.cachedMaster = user
    this.cacheExpiry = now + this.CACHE_TTL
    return user
  }

  /** 调用此方法可清除缓存，例如用户信息更新后 */
  public clearCache() {
    this.cachedMaster = null
    this.cacheExpiry = 0
  }

  attachUserAndToken(
    request: RequestBizRequest,
    user: UserModel,
    token: string,
  ) {
    request.user = user
    request.token = token

    Object.assign(request.res, {
      user,
      token,
    })
  }
}
