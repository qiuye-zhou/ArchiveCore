import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { basename, join } from 'node:path'

import { BackupService } from './backup.service'
import { Admin } from '~/common/decorator/auth.decorator'
import { getMediumDateTime } from '~/utils/time.util'
import { BACKUP_DIR } from '~/constants/path.constants'

@Controller('backup')
@Admin()
export class BackupController {
  constructor(private readonly backupService: BackupService) {}

  @Get('/new')
  @Header(
    'Content-Disposition',
    `attachment; filename="backup-${getMediumDateTime(new Date())}.zip"`,
  )
  @Header('Content-Type', 'application/zip')
  async createNewBackup(@Res() res) {
    const path = await this.backupService.backup()
    return res.sendFile(path)
  }

  @Get('/all')
  async get() {
    return this.backupService.list()
  }

  @Header('Content-Type', 'application/zip')
  @Get('/:dirname')
  async download(@Res() res, @Param('dirname') dirname: string) {
    const path = await this.backupService.getFile(dirname)
    return res.sendFile(path)
  }

  @Post('/uploadbackup')
  @UseInterceptors(FileInterceptor('file', { dest: BACKUP_DIR }))
  async uploadBackup(@UploadedFile() file: Express.Multer.File) {
    await this.backupService.saveBackupByUpload(file.path)
    return {
      message: 'File uploaded successfully',
    }
  }

  @Post('/restore')
  async restore(@Body() body: { restoreFilePath: string }) {
    // 前端传入的是备份文件名，需解析到 BACKUP_DIR 下并做路径穿越防护
    const filename = basename(body.restoreFilePath)
    if (
      !filename ||
      filename !== body.restoreFilePath ||
      filename.includes('..')
    ) {
      throw new BadRequestException('无效的备份文件名')
    }
    const fullPath = join(BACKUP_DIR, filename)
    return await this.backupService.restore(fullPath)
  }

  @Delete('/all')
  async deleteBackups() {
    return await this.backupService.deleteBackupAll()
  }

  @Delete('/:filename')
  async delete(@Param('filename') filename: string) {
    if (!filename) {
      return
    }
    await this.backupService.deleteBackup(filename)
    return
  }
}
