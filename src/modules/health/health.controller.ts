import { Controller, Get } from '@nestjs/common'

import { HttpCache } from '~/common/decorator/cache.decorator'
import { HealthService } from './health.service'

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get('/check')
  @HttpCache({
    disable: true,
  })
  async check() {
    return await this.healthService.checkHealth()
  }

  @Get('/status')
  @HttpCache({
    disable: true,
  })
  async getStatus() {
    return await this.healthService.checkHealth()
  }
}
