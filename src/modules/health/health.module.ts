import { Module, forwardRef } from '@nestjs/common'

import { HealthController } from './health.controller'
import { HealthLogController } from './sub-controller/log.controller'
import { HealthCronController } from './sub-controller/corn.controller'
import { HealthService } from './health.service'
import { CronService } from './cron.service'
import { CronModel } from './cron.model'
import { getProviderByTypegooseClass } from '~/transformers/model.transformer'
import { BackupModule } from '../backup/backup.module'

@Module({
  imports: [forwardRef(() => BackupModule)],
  controllers: [HealthController, HealthLogController, HealthCronController],
  providers: [
    HealthService,
    CronService,
    getProviderByTypegooseClass(CronModel),
  ],
  exports: [HealthService, CronService],
})
export class HealthModule {}
