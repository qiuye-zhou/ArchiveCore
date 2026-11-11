import {
  Controller,
  Delete,
  Get,
  Header,
  Param,
  Query,
  Res,
} from '@nestjs/common'

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

  /** 读取日志内容：默认只返回末尾 2000 行，避免大文件卡死浏览器 */
  @Get('/:filename')
  async getLogContent(
    @Param('filename') filename: string,
    @Query('tailLines') tailLines?: string,
  ) {
    const parsed = tailLines ? Number(tailLines) : undefined
    return await this.healthService.getLogContent(
      filename,
      Number.isFinite(parsed) ? parsed : undefined,
    )
  }

  /** 下载完整日志文件（大文件查看的兜底方案） */
  @Get('/:filename/download')
  @Header('Content-Type', 'text/plain; charset=utf-8')
  async downloadLog(@Param('filename') filename: string, @Res() res) {
    const path = this.healthService.resolveLogPath(filename)
    return res.sendFile(path)
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
