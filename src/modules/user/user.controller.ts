import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
} from '@nestjs/common'

import { UserService } from './user.service'
import { AuthService } from '../auth/auth.service'
import { LoginDto, UserDto, UserUpdateDto } from './user.dto'
import { UserDocument, UserModel } from './user.model'
import { HttpCache } from '~/common/decorator/cache.decorator'
import { IpLocation, IpRecord } from '~/common/decorator/ip.decorator'
import { Auth } from '~/common/decorator/auth.decorator'
import {
  GetRequestUser,
  GetRequestUserToken,
} from '~/common/decorator/user.decorator'

/** 仅管理员可用，否则抛 403 */
function requireAdmin(user: UserDocument) {
  // 历史数据中的 master 无 role 字段，视为管理员
  if ((user.role ?? 'admin') !== 'admin') {
    throw new ForbiddenException('仅管理员可执行此操作')
  }
}

@Controller('user')
export class UserController {
  constructor(
    private readonly userservice: UserService,
    private readonly authservice: AuthService,
  ) {}

  @Post('/register')
  async register(@Body() userDto: UserDto) {
    userDto.name = userDto.name ?? userDto.username
    return await this.userservice.createMaster(userDto as UserModel)
  }

  @Patch('/update')
  @Auth()
  @HttpCache.disable
  async updateMasterData(
    @GetRequestUser() user: UserDocument,
    @Body() body: UserUpdateDto,
  ) {
    return await this.userservice.updateUserData(user, body)
  }

  /** 用户管理：用户列表（仅管理员） */
  @Get('/all')
  @Auth()
  async listUsers(@GetRequestUser() user: UserDocument) {
    requireAdmin(user)
    return await this.userservice.listUsers()
  }

  /** 用户管理：创建用户（仅管理员） */
  @Post('/create')
  @Auth()
  async createUser(
    @GetRequestUser() user: UserDocument,
    @Body()
    body: {
      username: string
      password: string
      name?: string
      mail?: string
      role?: string
    },
  ) {
    requireAdmin(user)
    if (!body.username || !body.password) {
      throw new BadRequestException('用户名和密码不能为空')
    }
    if (body.password.length < 6) {
      throw new BadRequestException('密码至少 6 位')
    }
    return await this.userservice.createUser(body)
  }

  /** 用户管理：重置用户密码（仅管理员） */
  @Patch('/:id/password')
  @Auth()
  async resetPassword(
    @GetRequestUser() user: UserDocument,
    @Param('id') id: string,
    @Body() body: { password: string },
  ) {
    requireAdmin(user)
    if (!body.password || body.password.length < 6) {
      throw new BadRequestException('密码至少 6 位')
    }
    return await this.userservice.resetPassword(id, body.password)
  }

  @Post('/login')
  @HttpCache({ disable: true })
  @HttpCode(200)
  async login(@Body() dto: LoginDto, @IpLocation() ipLocation: IpRecord) {
    const user = await this.userservice.login(dto.username, dto.password)
    const footstep = await this.userservice.recordFootstep(
      ipLocation.ip,
      user.id,
    )
    const { name, username, created, mail, id, role } = user
    const createdTime = new Date(created).toString()
    const avatar = user.avatar
    return {
      token: await this.authservice.jwtServicePublic.sign(user.id, {
        ip: ipLocation.ip,
        ua: ipLocation.agent,
      }),
      ...footstep,
      name,
      username,
      createdTime,
      mail,
      avatar,
      id,
      role: role ?? 'admin',
    }
  }

  @Post('/logout')
  @Auth()
  singout(@GetRequestUserToken() token: string) {
    return this.userservice.signout(token)
  }

  @Get('/profile')
  @Auth()
  async getProfile(@GetRequestUser() user: UserDocument) {
    const { name, username, created, mail, id, avatar, role } = user
    return {
      id,
      name,
      username,
      mail,
      avatar,
      role: role ?? 'admin',
      createdTime: new Date(created).toString(),
      lastLoginTime: user.lastLoginTime,
      lastLoginIp: user.lastLoginIp,
    }
  }

  @Get('/sessionall')
  @Auth()
  getAllSession(@GetRequestUserToken() token: string) {
    return this.authservice.jwtServicePublic.getAllSession(token)
  }

  @Delete('/deleteAllSession')
  @Auth()
  deleteAllSession(@GetRequestUserToken() currentToken: string) {
    return this.authservice.jwtServicePublic.revokeAll([currentToken])
  }

  /** 用户管理：删除用户（仅管理员，且不能删除自己）；放在通配路由最后，避免抢占 /deleteAllSession */
  @Delete('/:id')
  @Auth()
  async deleteUser(@GetRequestUser() user: UserDocument, @Param('id') id: string) {
    requireAdmin(user)
    if (user.id === id || user._id?.toString() === id) {
      throw new BadRequestException('不能删除当前登录账号')
    }
    return await this.userservice.deleteUser(id)
  }
}
