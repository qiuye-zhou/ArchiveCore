import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common'

import { InitService } from './init.service'
import { ConfigService } from '../config/config.service'
import { InitGuard } from './init.guard'
import { InitMasterBodyDto, InitConfigDto } from './init.dto'

@Controller('/init')
export class InitController {
  constructor(
    private readonly configs: ConfigService,
    private readonly initService: InitService,
  ) {}

  @Get('/')
  async isInit() {
    return {
      isInit: await this.initService.isInit(),
    }
  }

  @Get('/status')
  async getStatus() {
    return this.initService.checkSystemStatus()
  }

  @Get('/configs/default')
  @UseGuards(InitGuard)
  async getDefaultConfig() {
    return this.configs.defaultConfig
  }

  @Post('/')
  @UseGuards(InitGuard)
  async init(@Body() body: InitMasterBodyDto) {
    const { config, ...userData } = body
    const result = await this.initService.initMasterUser(userData, config)
    return {
      success: true,
      message: '初始化成功',
      token: result.token,
      username: result.username,
    }
  }

  @Patch('/config')
  @UseGuards(InitGuard)
  async saveConfig(@Body() body: InitConfigDto) {
    await this.initService.saveSiteConfig(body)
    return {
      success: true,
      message: '站点配置已保存',
    }
  }

  @Get('/datadir')
  async getDatadir() {
    return {
      dataDir: this.initService.getDatadir(),
    }
  }
}
