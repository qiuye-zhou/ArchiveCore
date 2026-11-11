import { applyDecorators, UseGuards } from '@nestjs/common'

import { AuthGuard } from '../guard/auth.guard'
import { AdminGuard } from '../guard/admin.guard'

export function Auth() {
  const decorators: (ClassDecorator | PropertyDecorator | MethodDecorator)[] = [
    UseGuards(AuthGuard),
  ]

  return applyDecorators(...decorators)
}

/** 登录 + 管理员：先过 AuthGuard 挂载用户，再过 AdminGuard 校验角色 */
export function Admin() {
  const decorators: (ClassDecorator | PropertyDecorator | MethodDecorator)[] = [
    UseGuards(AuthGuard, AdminGuard),
  ]

  return applyDecorators(...decorators)
}
