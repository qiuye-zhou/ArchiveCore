import { BadRequestException, Injectable, Logger } from '@nestjs/common'

import { DATA_DIR } from '~/constants/path.constants'
import { UserService } from '../user/user.service'
import { ConfigService } from '../config/config.service'
import { UserModel } from '../user/user.model'
import { InitConfigDto } from './init.dto'

@Injectable()
export class InitService {
  constructor(
    private readonly userService: UserService,
    private readonly configService: ConfigService,
  ) {}

  getDatadir() {
    return DATA_DIR
  }

  isInit(): Promise<boolean> {
    return this.userService.hasMaster()
  }

  async initMasterUser(
    user: Pick<UserModel, 'username' | 'name' | 'password'> &
      Partial<Pick<UserModel, 'introduce' | 'avatar'>>,
    config?: InitConfigDto,
  ) {
    try {
      const isInit = await this.isInit()
      if (isInit) {
        throw new BadRequestException('系统已经初始化，无法重复初始化')
      }

      const createdUser = await this.userService.createMaster(user)
      if (!createdUser) {
        throw new BadRequestException('初始化管理员用户失败')
      }

      if (config) {
        await this.saveSiteConfig(config)
      }

      return createdUser
    } catch (error) {
      Logger.error('初始化管理员用户失败', error, 'InitService')
      throw error
    }
  }

  async saveSiteConfig(config: InitConfigDto): Promise<void> {
    const updates: Array<{ key: any; data: any }> = []

    if (config.seo) {
      updates.push({ key: 'seo', data: config.seo })
    }
    if (config.url) {
      updates.push({ key: 'url', data: config.url })
    }

    if (updates.length > 0) {
      await this.configService.batchUpdate(updates)
      Logger.log('站点配置已保存', 'InitService')
    }
  }

  async checkSystemStatus() {
    const isInit = await this.isInit()
    return {
      isInit,
      dataDir: this.getDatadir(),
      timestamp: new Date().toISOString(),
    }
  }
}
