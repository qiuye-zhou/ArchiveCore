import { Controller, Get, Delete, Param } from '@nestjs/common'

import { Auth, Admin } from '~/common/decorator/auth.decorator'
import { HealthService } from '../health.service'

@Controller('health/log')
@Auth()
export class HealthLogController {
  constructor(private readonly healthService: HealthService) {}

  @Get('/')
  async getLogs() {
    return await this.healthService.getLogs()
  }

  @Get('/:filename')
  async getLogContent(@Param('filename') filename: string) {
    return await this.healthService.getLogContent(filename)
  }

  @Delete('/:filename')
  @Admin()
  async deleteLog(@Param('filename') filename: string) {
    return await this.healthService.deleteLog(filename)
  }

  @Delete('/')
  @Admin()
  async deleteAllLogs() {
    return await this.healthService.deleteAllLogs()
  }
}
