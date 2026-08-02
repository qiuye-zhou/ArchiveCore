import { BadRequestException, Injectable, Logger } from '@nestjs/common'
import { readdir, readFile, rm, stat } from 'node:fs/promises'
import { join, resolve, basename } from 'node:path'
import { getDatabaseConnection } from '~/utils/database.util'
import { LOG_DIR, DATA_DIR } from '~/constants/path.constants'
import { getFileSize } from '~/utils/system.util'
import { CronService } from './cron.service'
import { CronStatus } from './cron.model'

@Injectable()
export class HealthService {
  constructor(private readonly cronService: CronService) {}

  private validateFilename(filename: string): string {
    const sanitized = basename(filename)
    if (!sanitized || sanitized !== filename || sanitized.includes('..')) {
      throw new BadRequestException('无效的文件名')
    }
    return sanitized
  }

  async checkHealth() {
    const healthStatus = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      components: {
        database: await this.checkDatabase(),
        system: this.checkSystem(),
        memory: this.checkMemory(),
        directories: await this.checkDirectories(),
      },
    }

    // 如果任何组件状态为 error，整体状态为 error
    if (
      Object.values(healthStatus.components).some(
        (component) => component.status === 'error',
      )
    ) {
      healthStatus.status = 'error'
    }

    return healthStatus
  }

  private async checkDirectories() {
    const directories = [LOG_DIR, DATA_DIR]
    const results = []

    for (const dir of directories) {
      try {
        const dirStat = await stat(dir)
        if (dirStat.isDirectory()) {
          results.push({
            path: dir,
            status: 'ok',
            message: 'Directory exists and is accessible',
          })
        } else {
          results.push({
            path: dir,
            status: 'error',
            message: 'Path exists but is not a directory',
          })
        }
      } catch (error) {
        results.push({
          path: dir,
          status: 'error',
          message: `Directory error: ${error}`,
        })
      }
    }

    const hasErrors = results.some((result) => result.status === 'error')

    return {
      status: hasErrors ? 'error' : 'ok',
      message: hasErrors
        ? 'Some directories have issues'
        : 'All directories are healthy',
      details: results,
    }
  }

  private async checkDatabase() {
    try {
      const connection = await getDatabaseConnection()
      const state = connection.readyState

      if (state === 1) {
        return {
          status: 'ok',
          message: 'Database connection is healthy',
          details: {
            host: connection.host,
            port: connection.port,
            name: connection.name,
          },
        }
      } else {
        return {
          status: 'error',
          message: `Database connection is not ready: state ${state}`,
        }
      }
    } catch (error) {
      return {
        status: 'error',
        message: `Database connection error: ${error}`,
      }
    }
  }

  private checkSystem() {
    return {
      status: 'ok',
      message: 'System is healthy',
      details: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        uptime: process.uptime(),
      },
    }
  }

  private checkMemory() {
    const memory = process.memoryUsage()
    return {
      status: 'ok',
      message: 'Memory usage is within acceptable range',
      details: {
        rss: `${(memory.rss / 1024 / 1024).toFixed(2)} MB`,
        heapTotal: `${(memory.heapTotal / 1024 / 1024).toFixed(2)} MB`,
        heapUsed: `${(memory.heapUsed / 1024 / 1024).toFixed(2)} MB`,
        external: `${(memory.external / 1024 / 1024).toFixed(2)} MB`,
      },
    }
  }

  async getLogs() {
    try {
      const logFiles = await readdir(LOG_DIR)
      const logs = []

      for (const filename of logFiles) {
        const path = resolve(LOG_DIR, filename)
        const size = getFileSize(path)
        const fileStat = await stat(path)

        logs.push({
          filename,
          size,
          path,
          modifiedAt: new Date(fileStat.mtimeMs || Date.now()),
        })
      }

      // 按修改时间排序，最新的在前
      logs.sort((a, b) => b.modifiedAt.getTime() - a.modifiedAt.getTime())

      return logs
    } catch (error) {
      Logger.error('Failed to get logs', error, 'HealthService')
      return []
    }
  }

  async getLogContent(filename: string) {
    const safeName = this.validateFilename(filename)
    try {
      const path = join(LOG_DIR, safeName)
      const content = await readFile(path, { encoding: 'utf8' })
      return { filename, content }
    } catch (error) {
      Logger.error(
        `Failed to get log content for ${filename}`,
        error,
        'HealthService',
      )
      throw new Error(`Failed to read log file: ${error}`)
    }
  }

  async deleteLog(filename: string) {
    const safeName = this.validateFilename(filename)
    try {
      const path = join(LOG_DIR, safeName)
      await rm(path)
      return { success: true, message: `Log file ${filename} deleted` }
    } catch (error) {
      Logger.error(
        `Failed to delete log file ${filename}`,
        error,
        'HealthService',
      )
      throw new Error(`Failed to delete log file: ${error}`)
    }
  }

  async deleteAllLogs() {
    try {
      const logFiles = await readdir(LOG_DIR)
      for (const filename of logFiles) {
        const path = join(LOG_DIR, filename)
        await rm(path)
      }
      return { success: true, message: 'All log files deleted' }
    } catch (error) {
      Logger.error('Failed to delete all log files', error, 'HealthService')
      throw new Error(`Failed to delete all log files: ${error}`)
    }
  }

  async getCronJobs() {
    return await this.cronService.getAllJobs()
  }

  async triggerCronJob(jobId: string) {
    return await this.cronService.triggerJob(jobId)
  }

  async updateCronJobStatus(jobId: string, status: CronStatus) {
    return await this.cronService.updateJobStatus(jobId, status)
  }
}
