import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common'
import { Type } from 'class-transformer'
import { IsArray, IsObject, IsString, ValidateNested } from 'class-validator'

import { ConfigService } from './config.service'
import { Auth } from '~/common/decorator/auth.decorator'
import { ConfigKeyDto } from './config.dto'
import { IConfig } from './configs.interface'

/** 单个配置更新项 */
class BatchUpdateItemDto {
  @IsString()
  key: keyof IConfig

  @IsObject()
  data: Record<string, unknown>
}

/** 批量更新入参 */
class BatchUpdateDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BatchUpdateItemDto)
  updates: BatchUpdateItemDto[]
}

@Controller('config')
export class ConfigController {
  constructor(private readonly configService: ConfigService) {}

  @Get('/getconfig')
  @Auth()
  async getconfig() {
    return this.configService.getConfig()
  }

  @Get('/keys')
  @Auth()
  async getAllConfigKeys() {
    return this.configService.getAllConfigKeys()
  }

  @Get('/getconfig/:key')
  @Auth()
  async getConfigByKey(@Param('key') key: string) {
    return this.configService.getConfigByKey(key as keyof IConfig)
  }

  @Get('/validate')
  @Auth()
  async validateConfig(@Query('key') key?: string) {
    return this.configService.validateConfig(key as keyof IConfig | undefined)
  }

  @Patch('/:key')
  @Auth()
  async updataconfig(
    @Param() params: ConfigKeyDto,
    @Body() body: Record<string, any>,
  ) {
    return this.configService.updata(params.key, body)
  }

  @Post('/batch')
  @Auth()
  async batchUpdate(@Body() body: BatchUpdateDto) {
    return this.configService.batchUpdate(
      body.updates as unknown as Array<{
        key: keyof IConfig
        data: Partial<IConfig[keyof IConfig]>
      }>,
    )
  }

  @Delete('/reset/:key')
  @Auth()
  async resetConfigByKey(@Param('key') key: string) {
    await this.configService.resetConfig(key as keyof IConfig)
    return { message: '配置项已重置' }
  }

  @Delete('/reset')
  @Auth()
  async resetAllConfig() {
    await this.configService.resetConfig()
    return { message: '所有配置已重置' }
  }

  @Post('/reload')
  @Auth()
  async reloadConfig() {
    return this.configService.reloadConfig()
  }
}
