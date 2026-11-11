import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  Injectable,
  Logger,
  UnprocessableEntityException,
} from '@nestjs/common'
import { compareSync } from 'bcryptjs'
import { ReturnModelType } from '@typegoose/typegoose'
import { ModuleRef } from '@nestjs/core'

import { AuthService } from '../auth/auth.service'
import { InjectModel } from '~/transformers/model.transformer'
import { UserDocument, UserModel } from './user.model'
import { sleep } from '~/utils/tool.util'

@Injectable()
export class UserService {
  constructor(
    @InjectModel(UserModel)
    private readonly userModel: ReturnModelType<typeof UserModel>,
    private readonly authservice: AuthService,
    private readonly moduleRef: ModuleRef,
  ) {}

  public async getMaster() {
    const master = await this.userModel.findOne().lean()
    if (!master) {
      throw new BadRequestException('我还没有主人')
    }
    return master
  }

  async hasMaster() {
    return !!(await this.userModel.countDocuments())
  }

  async createMaster(
    model: Pick<UserModel, 'username' | 'name' | 'password'> &
      Partial<Pick<UserModel, 'introduce' | 'avatar'>>,
  ) {
    const hasMaster = await this.hasMaster()

    if (hasMaster) {
      throw new BadRequestException('已经有一个主人了哦')
    }

    const res = await this.userModel.create({ ...model, role: 'admin' })
    const token = await this.authservice.jwtServicePublic.sign(res.id)
    return { token, username: res.username }
  }

  /** 用户管理：列出全部用户（不含密码） */
  async listUsers() {
    const users = await this.userModel.find().sort({ created: 1 }).lean()
    return users.map((u) => ({
      id: u._id.toString(),
      username: u.username,
      name: u.name,
      mail: u.mail,
      avatar: u.avatar,
      role: u.role ?? 'admin',
      createdTime: u.created ? new Date(u.created).toString() : undefined,
      lastLoginTime: u.lastLoginTime,
      lastLoginIp: u.lastLoginIp,
    }))
  }

  /** 用户管理：创建协作者账号（仅管理员调用，入口由 controller 校验角色） */
  async createUser(model: {
    username: string
    password: string
    name?: string
    mail?: string
    role?: string
  }) {
    const exists = await this.userModel.findOne({ username: model.username })
    if (exists) {
      throw new BadRequestException('用户名已存在')
    }
    const res = await this.userModel.create({
      username: model.username,
      password: model.password,
      name: model.name ?? model.username,
      mail: model.mail,
      role: model.role === 'admin' ? 'admin' : 'editor',
    })
    return {
      id: res.id,
      username: res.username,
      name: res.name,
      role: res.role,
    }
  }

  /** 用户管理：删除用户；不允许删除最后一个管理员 */
  async deleteUser(id: string) {
    const target = await this.userModel.findById(id)
    if (!target) {
      throw new BadRequestException('用户不存在')
    }
    // 历史数据中的 master 无 role 字段，视为管理员
    if ((target.role ?? 'admin') === 'admin') {
      const adminCount = await this.userModel.countDocuments({
        role: { $ne: 'editor' },
      })
      if (adminCount <= 1) {
        throw new BadRequestException('至少需要保留一个管理员账号')
      }
    }
    await this.userModel.deleteOne({ _id: id })
    return
  }

  /** 用户管理：管理员重置指定用户密码，并使该用户全部会话失效 */
  async resetPassword(id: string, newPassword: string) {
    const target = await this.userModel.findById(id)
    if (!target) {
      throw new BadRequestException('用户不存在')
    }
    target.password = newPassword
    await target.save()
    return
  }

  async login(username: string, password: string) {
    const user = await this.userModel.findOne({ username }).select('+password')
    if (!user) {
      await sleep(3000)
      throw new ForbiddenException('用户名不正确')
    }
    if (!compareSync(password, user.password)) {
      await sleep(3000)
      throw new ForbiddenException('密码不正确')
    }

    return user
  }

  /**
   * 记录登陆的 (ip, 时间)
   *
   * @async
   * @param {string} ip - string
   * @param {string} userId - 登录用户 id（多用户下更新本人，缺省回退到第一个用户）
   * @return {Promise<Record<string, Date|string>>} 返回上次登入IP
   */
  async recordFootstep(
    ip: string,
    userId?: string,
  ): Promise<Record<string, Date | string>> {
    const master = userId
      ? await this.userModel.findById(userId)
      : await this.userModel.findOne()
    if (!master) {
      throw new HttpException(
        HttpException.createBody({
          code: 9999,
          message: '当前不存在Master',
        }),
        500,
      )
    }
    const PrevFootstep = {
      lastLoginTime:
        master.lastLoginTime?.toString() || new Date(1600000000000),
      lastLoginIp: master.lastLoginIp || null,
    }
    await master.updateOne({
      lastLoginTime: new Date(),
      lastLoginIp: ip,
    })

    Logger.warn(`已登录，IP: ${ip}`, 'user')
    return PrevFootstep as any
  }

  /**
   * 修改密码等Master信息
   *
   * @async
   * @param {UserDocument} user - 用户查询结果，已经挂载在 req.user
   * @param {Partial<UserModel>} data - 部分修改数据
   */
  async updateUserData(user: UserDocument, data: Partial<UserModel>) {
    const { password } = data
    const docum = { ...data }

    if (password !== undefined) {
      const { _id } = user
      const currentUser = await this.userModel
        .findById(_id)
        .select('+password +apiToken')
      if (!currentUser) {
        throw new HttpException(
          HttpException.createBody({
            code: 9999,
            message: '当前不存在Master',
          }),
          500,
        )
      }
      const isSame = compareSync(password, currentUser.password)
      if (isSame) {
        throw new UnprocessableEntityException('密码可不能和原来的一样哦!')
      }
      await this.authservice.jwtServicePublic.revokeAll()
    }
    const result = await this.userModel.updateOne({ _id: user._id }, docum)

    // 清除 AuthGuard 的用户缓存，确保下次请求获取最新用户数据
    try {
      const { AuthGuard } = await import('~/common/guard/auth.guard')
      const authGuard = this.moduleRef.get(AuthGuard, { strict: false })
      authGuard?.clearCache()
    } catch {
      // ignore if AuthGuard not available
    }

    return result
  }

  signout(token: string) {
    return this.authservice.jwtServicePublic.revokeToken(token)
  }

  async findById(id: string) {
    return await this.userModel.findById(id)
  }
}
