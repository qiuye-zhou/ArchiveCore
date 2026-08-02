import { BadRequestException, Injectable, Logger } from '@nestjs/common'
import { plainToInstance } from 'class-transformer'
import { cloneDeep, mergeWith } from 'lodash'
import { ReturnModelType } from '@typegoose/typegoose'

import { InjectModel } from '~/transformers/model.transformer'
import { ConfigOptionModel } from './config.model'
import { generateDefaultConfig } from './configs.default'
import { IConfig, configDtoMapping } from './configs.interface'
import { RedisService } from '~/processors/redis/redis.service'
import { getRedisKey } from '~/utils/redis.util'
import { RedisKeys } from '~/constants/cache.constants'
import { isDev } from '~/global/env.global'

const configsKeySet = new Set(Object.keys(configDtoMapping))

@Injectable()
export class ConfigService {
  configInitd: boolean = false
  constructor(
    @InjectModel(ConfigOptionModel)
    private readonly configoptionModel: ReturnModelType<
      typeof ConfigOptionModel
    >,
    private readonly redisService: RedisService,
  ) {
    this.configInit().then(() => {
      Logger.log('Config 已经加载完毕！', 'config')
    })
  }

  async configInit() {
    const configs = await this.configoptionModel.find().lean()
    const defaultConfig = generateDefaultConfig()
    configs.forEach((field) => {
      const name = field.name as keyof IConfig

      if (!configsKeySet.has(name)) {
        return
      }
      if (isDev && name === 'url') {
        return
      }
      const value = field.value
      defaultConfig[name] = { ...defaultConfig[name], ...value }
    })

    await this.setConfig(defaultConfig)
    this.configInitd = true
  }

  public get defaultConfig() {
    return generateDefaultConfig()
  }

  private async setConfig(config: IConfig) {
    const redis = this.redisService.getClient()
    await redis.set(getRedisKey(RedisKeys.ConfigCache), JSON.stringify(config))
  }

  public async getConfig(errorRetryCount = 3): Promise<Readonly<IConfig>> {
    const configCache = await this.redisService
      .getClient()
      .get(getRedisKey(RedisKeys.ConfigCache))

    if (configCache) {
      try {
        const instanceConfigsValue = plainToInstance<IConfig, any>(
          IConfig as any,
          JSON.parse(configCache) as any,
        ) as any as IConfig

        return instanceConfigsValue
      } catch (error) {
        await this.configInit()
        if (errorRetryCount > 0) {
          return await this.getConfig(--errorRetryCount)
        }
        Logger.error('获取配置失败', 'config')
        throw error
      }
    } else {
      await this.configInit()

      return await this.getConfig()
    }
  }

  async updata<T extends keyof IConfig>(
    key: T,
    data: Partial<IConfig[T]>,
  ): Promise<IConfig[T]> {
    if (!configsKeySet.has(key as string)) {
      throw new BadRequestException(`配置项 ${key} 不存在`)
    }

    const config = await this.getConfig()
    const mergedValue = mergeWith(
      cloneDeep(config[key]),
      data,
      (old, newer) => {
        if (Array.isArray(old)) {
          return newer
        }
        if (typeof old === 'object' && typeof newer === 'object') {
          return { ...old, ...newer }
        }
      },
    )

    const updatedConfigRow = await this.configoptionModel
      .findOneAndUpdate(
        { name: key as string },
        { value: mergedValue },
        { upsert: true, new: true },
      )
      .lean()

    const newData = updatedConfigRow!.value
    const mergedFullConfig = Object.assign({}, config, { [key]: newData })

    await this.setConfig(mergedFullConfig)

    return newData
  }

  async getConfigByKey<T extends keyof IConfig>(key: T): Promise<IConfig[T]> {
    const config = await this.getConfig()
    const value = config[key]

    if (value === undefined) {
      throw new BadRequestException(`配置项 ${key} 不存在`)
    }

    return value
  }

  async batchUpdate(
    updates: Array<{
      key: keyof IConfig
      data: Partial<IConfig[keyof IConfig]>
    }>,
  ): Promise<IConfig> {
    const config = await this.getConfig()
    const configObj = Object.assign({}, config) as any

    for (const { key, data } of updates) {
      if (!configsKeySet.has(key as string)) {
        throw new BadRequestException(`配置项 ${key} 不存在`)
      }

      const mergedValue = mergeWith(
        cloneDeep(config[key]),
        data,
        (old, newer) => {
          if (Array.isArray(old)) {
            return newer
          }
          if (typeof old === 'object' && typeof newer === 'object') {
            return { ...old, ...newer }
          }
        },
      )

      const updatedConfigRow = await this.configoptionModel
        .findOneAndUpdate(
          { name: key as string },
          { value: mergedValue },
          { upsert: true, new: true },
        )
        .lean()

      if (updatedConfigRow) {
        configObj[key] = updatedConfigRow.value
      }
    }

    await this.setConfig(configObj)

    return configObj
  }

  async resetConfig(key?: keyof IConfig): Promise<void> {
    const defaultConfig = generateDefaultConfig()

    if (key) {
      if (!configsKeySet.has(key as string)) {
        throw new BadRequestException(`配置项 ${key} 不存在`)
      }

      await this.configoptionModel.findOneAndUpdate(
        { name: key as string },
        { value: defaultConfig[key] },
      )

      const config = await this.getConfig()
      const configObj = Object.assign({}, config) as any
      configObj[key] = defaultConfig[key]
      await this.setConfig(configObj)
    } else {
      const allConfigs = await this.configoptionModel.find().lean()
      for (const field of allConfigs) {
        const name = field.name as keyof IConfig
        if (configsKeySet.has(name) && defaultConfig[name]) {
          await this.configoptionModel.findOneAndUpdate(
            { name },
            { value: defaultConfig[name] },
          )
        }
      }

      await this.setConfig(defaultConfig)
    }

    Logger.log(`配置${key ? `项 ${key}` : '已全部重置'}`, 'config')
  }

  async validateConfig(key?: keyof IConfig): Promise<{
    valid: boolean
    errors: Array<{ key: string; error: string }>
  }> {
    const errors: Array<{ key: string; error: string }> = []
    const config = await this.getConfig()

    if (key) {
      const value = config[key]
      const isValid = await this.validateConfigValue(key, value)
      if (!isValid) {
        errors.push({ key, error: '配置验证失败' })
      }
    } else {
      for (const configKey of Object.keys(configDtoMapping)) {
        const value = config[configKey as keyof IConfig]
        const isValid = await this.validateConfigValue(
          configKey as keyof IConfig,
          value,
        )
        if (!isValid) {
          errors.push({ key: configKey, error: '配置验证失败' })
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    }
  }

  private async validateConfigValue(
    key: keyof IConfig,
    value: any,
  ): Promise<boolean> {
    try {
      if (value === undefined || value === null) {
        return false
      }

      const dtoClass = configDtoMapping[key as string]
      if (dtoClass) {
        const instance = plainToInstance(dtoClass, value)
        const { validate } = await import('class-validator')
        const validationErrors = await validate(instance)
        return validationErrors.length === 0
      }

      return true
    } catch {
      return false
    }
  }

  async getAllConfigKeys(): Promise<
    Array<{ key: keyof IConfig; description: string }>
  > {
    return Object.keys(configDtoMapping).map((key) => ({
      key: key as keyof IConfig,
      description: this.getConfigDescription(key as keyof IConfig),
    }))
  }

  private getConfigDescription(key: keyof IConfig): string {
    const descriptions: Record<string, string> = {
      seo: 'SEO 设置',
      url: '网站 URL 配置',
      adminExtra: '后台附加设置',
    }
    return descriptions[key] || '未分类配置'
  }

  async reloadConfig(): Promise<IConfig> {
    await this.configInit()
    return await this.getConfig()
  }
}
