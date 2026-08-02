import { Controller, Get, Post, Param, Patch, Body } from '@nestjs/common'

import { Auth } from '~/common/decorator/auth.decorator'
import { HealthService } from '../health.service'
import { CronStatus } from '../cron.model'

class UpdateCronStatusDto {
  status: CronStatus
}

@Controller('health/cron')
@Auth()
export class HealthCronController {
  constructor(private readonly healthService: HealthService) {}

  @Get('/')
  async getAllCron() {
    return await this.healthService.getCronJobs()
  }

  @Post('/:jobId/trigger')
  async triggerCronJob(@Param('jobId') jobId: string) {
    return await this.healthService.triggerCronJob(jobId)
  }

  @Patch('/:jobId/status')
  async updateCronJobStatus(
    @Param('jobId') jobId: string,
    @Body() body: UpdateCronStatusDto,
  ) {
    return await this.healthService.updateCronJobStatus(jobId, body.status)
  }
}
