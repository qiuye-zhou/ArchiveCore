import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common'

import { UserModel } from '~/modules/user/user.model'

/**
 * 管理员权限守卫：需在 AuthGuard 之后执行（request.user 已被挂载）。
 * 历史数据中的 master 无 role 字段，视为管理员；仅 editor 被拒绝。
 */
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest()
    const user = request.user as UserModel | undefined
    if (!user) {
      throw new ForbiddenException('未登录')
    }
    if ((user.role ?? 'admin') !== 'admin') {
      throw new ForbiddenException('仅管理员可执行此操作')
    }
    return true
  }
}
