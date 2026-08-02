import {
  Injectable,
  Logger,
  OnModuleInit,
  forwardRef,
  Inject,
} from '@nestjs/common'
import { ReturnModelType } from '@typegoose/typegoose'

import { InjectModel } from '~/transformers/model.transformer'
import { CronModel, CronStatus } from './cron.model'
import { BackupService } from '../backup/backup.service'

@Injectable()
export class CronService implements OnModuleInit {
  private readonly logger = new Logger(CronService.name)
  private readonly cronJobs: Map<string, NodeJS.Timeout> = new Map()
  private readonly jobHandlers: Map<string, () => Promise<void>> = new Map()

  constructor(
    @InjectModel(CronModel)
    private readonly cronModel: ReturnModelType<typeof CronModel>,
    @Inject(forwardRef(() => BackupService))
    private readonly backupService: BackupService,
  ) {}

  async onModuleInit() {
    await this.initializeDefaultJobs()
    await this.startAllActiveJobs()
  }

  private async initializeDefaultJobs() {
    const defaultJobs = [
      {
        name: 'backup-job',
        schedule: '0 0 * * *',
        handler: 'backup',
        description: '每日自动备份数据库和文件',
      },
    ]

    for (const job of defaultJobs) {
      const existing = await this.cronModel.findOne({ name: job.name })
      if (!existing) {
        await this.cronModel.create(job)
      }
    }

    this.registerHandlers()
  }

  private registerHandlers() {
    this.jobHandlers.set('backup', async () => {
      try {
        this.logger.log('执行定时备份任务')
        await this.backupService.backup()
        this.logger.log('定时备份任务完成')
      } catch (error) {
        this.logger.error('定时备份任务失败', error)
        throw error
      }
    })
  }

  private parseCronExpression(cronExpr: string): (now: Date) => boolean {
    const parts = cronExpr.trim().split(/\s+/)
    if (parts.length !== 5) {
      throw new Error(`Invalid cron expression: ${cronExpr}`)
    }
    const [minutePart, hourPart, dayPart, monthPart, dayOfWeekPart] = parts

    const matchPart = (part: string, value: number): boolean => {
      if (part === '*') return true

      // 支持逗号分隔的多个值: 1,3,5
      const segments = part.split(',')
      for (const segment of segments) {
        // 支持步长: */5 或 1-10/2
        const stepMatch = segment.match(/^(.+)\/(\d+)$/)
        if (stepMatch) {
          const range = stepMatch[1]
          const step = parseInt(stepMatch[2], 10)
          if (range === '*') {
            if (value % step === 0) return true
          } else if (range.includes('-')) {
            const [start, end] = range.split('-').map(Number)
            if (value >= start && value <= end && (value - start) % step === 0)
              return true
          } else {
            const start = Number(range)
            if (value >= start && (value - start) % step === 0) return true
          }
          continue
        }

        // 支持范围: 1-5
        if (segment.includes('-')) {
          const [start, end] = segment.split('-').map(Number)
          if (value >= start && value <= end) return true
          continue
        }

        // 精确匹配: 5
        const num = Number(segment)
        if (!isNaN(num) && num === value) return true
      }

      return false
    }

    return (now: Date) => {
      const nowMinute = now.getMinutes()
      const nowHour = now.getHours()
      const nowDay = now.getDate()
      const nowMonth = now.getMonth() + 1
      const nowDayOfWeek = now.getDay()

      return (
        matchPart(minutePart, nowMinute) &&
        matchPart(hourPart, nowHour) &&
        matchPart(dayPart, nowDay) &&
        matchPart(monthPart, nowMonth) &&
        matchPart(dayOfWeekPart, nowDayOfWeek)
      )
    }
  }

  private calculateNextRun(cronExpr: string, from: Date = new Date()): Date {
    const next = new Date(from.getTime())
    next.setSeconds(0)
    next.setMilliseconds(0)
    next.setMinutes(next.getMinutes() + 1)

    const shouldRun = this.parseCronExpression(cronExpr)

    for (let i = 0; i < 525600; i++) {
      if (shouldRun(next)) {
        return next
      }
      next.setMinutes(next.getMinutes() + 1)
    }

    return new Date(from.getTime() + 24 * 60 * 60 * 1000)
  }

  private async startJob(cron: any) {
    if (cron.status !== CronStatus.Active) {
      return
    }

    const jobKey = cron._id.toString()
    if (this.cronJobs.has(jobKey)) {
      this.stopJob(jobKey)
    }

    const handler = this.jobHandlers.get(cron.handler)
    if (!handler) {
      this.logger.warn(`未找到任务处理器: ${cron.handler}`)
      return
    }

    const runJob = async () => {
      const now = new Date()
      const shouldRun = this.parseCronExpression(cron.schedule)

      if (shouldRun(now)) {
        try {
          await handler()
          await this.cronModel.findByIdAndUpdate(cron._id, {
            lastRun: new Date(),
            lastError: null,
          })
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error)
          await this.cronModel.findByIdAndUpdate(cron._id, {
            lastRun: new Date(),
            lastError: errorMessage,
          })
        }
      }

      const nextRun = this.calculateNextRun(cron.schedule, now)
      const delay = nextRun.getTime() - Date.now()

      if (delay > 0) {
        const timeout = setTimeout(runJob, delay)
        this.cronJobs.set(jobKey, timeout)
      }
    }

    const nextRun = this.calculateNextRun(cron.schedule)
    const delay = nextRun.getTime() - Date.now()

    if (delay > 0) {
      const timeout = setTimeout(runJob, delay)
      this.cronJobs.set(jobKey, timeout)
      this.logger.log(`任务 ${cron.name} 已启动，下次运行时间: ${nextRun}`)
    }
  }

  private stopJob(jobKey: string) {
    const timeout = this.cronJobs.get(jobKey)
    if (timeout) {
      clearTimeout(timeout)
      this.cronJobs.delete(jobKey)
    }
  }

  private async startAllActiveJobs() {
    const activeJobs = await this.cronModel.find({ status: CronStatus.Active })
    for (const job of activeJobs) {
      await this.startJob(job)
    }
  }

  async getAllJobs() {
    const jobs = await this.cronModel.find().sort({ created: -1 })
    return jobs.map((job) => ({
      id: job._id.toString(),
      name: job.name,
      schedule: job.schedule,
      status: job.status,
      lastRun: job.lastRun?.toISOString() || null,
      lastError: job.lastError || null,
      nextRun: this.calculateNextRun(job.schedule).toISOString(),
      description: job.description || '',
      handler: job.handler,
    }))
  }

  async triggerJob(jobId: string) {
    const job = await this.cronModel.findById(jobId)
    if (!job) {
      throw new Error('任务不存在')
    }

    const handler = this.jobHandlers.get(job.handler)
    if (!handler) {
      throw new Error('未找到任务处理器')
    }

    try {
      await handler()
      await this.cronModel.findByIdAndUpdate(jobId, {
        lastRun: new Date(),
        lastError: null,
      })
      return {
        success: true,
        message: `任务 ${job.name} 手动触发成功`,
        jobId,
        timestamp: new Date().toISOString(),
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      await this.cronModel.findByIdAndUpdate(jobId, {
        lastRun: new Date(),
        lastError: errorMessage,
      })
      throw error
    }
  }

  async updateJobStatus(jobId: string, status: CronStatus) {
    const job = await this.cronModel.findByIdAndUpdate(
      jobId,
      { status },
      { new: true },
    )
    if (!job) {
      throw new Error('任务不存在')
    }

    const jobKey = job._id.toString()
    if (status === CronStatus.Active) {
      await this.startJob(job)
    } else {
      this.stopJob(jobKey)
    }

    return job
  }
}
