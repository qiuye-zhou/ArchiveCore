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
 * 多用户：按 token 中的用户 id 加载对应用户并挂载到 request.user，
 * 带按 id 的短缓存（用户信息更新时通过 clearCache 失效）。
 */

@Injectable()
export class AuthGuard implements CanActivate {
  private cachedUsers = new Map<string, { user: UserModel; expiry: number }>()
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

    const user = await this.getCachedUser(result.id)
    if (!user) {
      throw new UnauthorizedException('用户不存在或已被删除')
    }
    this.attachUserAndToken(request, user, token)
    return true
  }

  private async getCachedUser(id: string): Promise<UserModel | null> {
    const now = Date.now()
    const cached = this.cachedUsers.get(id)
    if (cached && now < cached.expiry) {
      return cached.user
    }
    const user = await this.userService.findById(id)
    if (!user) return null
    const lean = (user as any).toObject ? (user as any).toObject() : user
    this.cachedUsers.set(id, { user: lean, expiry: now + this.CACHE_TTL })
    return lean
  }

  /** 调用此方法可清除缓存，例如用户信息更新后 */
  public clearCache() {
    this.cachedUsers.clear()
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
