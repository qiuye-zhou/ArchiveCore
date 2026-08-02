import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common'
import { mkdirp } from 'mkdirp'
import { basename, join, resolve } from 'node:path'
import * as archiver from 'archiver'
import { createWriteStream, existsSync } from 'fs'
import { readdir, rename, rm } from 'node:fs/promises'

import { MONGO_DB } from '~/app.config'
import { execCommand } from '~/utils/execCommandSync.util'
import { getMediumDateTime } from '~/utils/time.util'
import { ASSET_DIR, BACKUP_DIR, STATIC_DIR } from '~/constants/path.constants'
import { getFileSize } from '~/utils/system.util'

// const excludeFolders = ['log'];

@Injectable()
export class BackupService {
  constructor() {}

  async list() {
    const backupPath = BACKUP_DIR
    if (!existsSync(backupPath)) {
      return []
    }
    const backupFilenames = await readdir(backupPath)
    const backups: { filename: string; path: string }[] = []

    for (const filename of backupFilenames) {
      const path = resolve(backupPath, filename)
      backups.push({
        filename,
        path,
      })
    }
    return Promise.all(
      backups.map(async (item) => {
        const size = getFileSize(item.path)
        delete item.path
        return { ...item, size }
      }),
    )
  }

  async getFile(dirname: string) {
    const sanitized = basename(dirname)
    if (!sanitized || sanitized !== dirname || sanitized.includes('..')) {
      throw new BadRequestException('无效的文件名')
    }
    const path = join(BACKUP_DIR, sanitized)
    if (!existsSync(path)) {
      throw new BadRequestException('文件不存在')
    }
    return path
  }

  async backup() {
    Logger.log('备份数据中', 'backup')
    const dateDir = getMediumDateTime(new Date())
    const backupDirPath = join(BACKUP_DIR, dateDir)
    await mkdirp(backupDirPath)

    await execCommand('mongodump', [
      '--uri',
      MONGO_DB.uri,
      '-d',
      MONGO_DB.dbName,
      '-o',
      backupDirPath,
    ])

    const archivezip = archiver('zip', {
      zlib: { level: 9 },
    })
    const output = createWriteStream(join(BACKUP_DIR, `backup-${dateDir}.zip`))
    archivezip.pipe(output)
    archivezip.directory(backupDirPath, 'db')
    archivezip.directory(ASSET_DIR, 'asset')
    archivezip.directory(STATIC_DIR, 'static')
    await new Promise<void>((resolve, reject) => {
      output.on('close', () => resolve())
      archivezip.on('error', reject)
      archivezip.finalize()
    })
    Logger.log('备份成功', 'backup')
    const path = join(BACKUP_DIR, `backup-${dateDir}.zip`)
    await rm(backupDirPath, { recursive: true, force: true })
    return path
  }

  async deleteBackupAll() {
    try {
      const files = await this.list()
      for (const file of files) {
        await rm(join(BACKUP_DIR, file.filename), { recursive: true })
      }
    } catch (err) {
      throw new BadRequestException(err)
    }
  }

  async deleteBackup(filename: string) {
    const sanitized = basename(filename)
    if (!sanitized || sanitized !== filename || sanitized.includes('..')) {
      throw new BadRequestException('无效的文件名')
    }
    const path = join(BACKUP_DIR, sanitized)
    if (!existsSync(path)) {
      throw new BadRequestException('文件不存在')
    }
    await rm(path, { recursive: true })
    return true
  }

  async saveBackupByUpload(oldPath: string) {
    const newPath = join(BACKUP_DIR, `${getMediumDateTime(new Date())}.zip`)
    await rename(oldPath, newPath)

    return
  }

  async restore(restoreFilePath: string) {
    const isExist = existsSync(restoreFilePath)
    if (!isExist) {
      throw new InternalServerErrorException('该备份文件不存在')
    }

    const tempDir = join(BACKUP_DIR, `restore-${getMediumDateTime(new Date())}`)
    await mkdirp(tempDir)

    try {
      try {
        await execCommand('7z', ['x', restoreFilePath, `-o${tempDir}`])
      } catch {
        try {
          await execCommand('unzip', [restoreFilePath, '-d', tempDir])
        } catch {
          throw new InternalServerErrorException(
            '解压失败，请确保系统安装了 7z 或 unzip 命令',
          )
        }
      }

      const dbDir = join(tempDir, 'db', MONGO_DB.dbName)
      if (existsSync(dbDir)) {
        await execCommand('mongorestore', [
          '--uri',
          MONGO_DB.uri,
          '--dir',
          dbDir,
          '--drop',
        ])
        Logger.log('数据库恢复成功', 'backup')
      }

      const assetDir = join(tempDir, 'asset')
      if (existsSync(assetDir)) {
        Logger.log('静态文件恢复成功', 'backup')
      }

      const staticDir = join(tempDir, 'static')
      if (existsSync(staticDir)) {
        Logger.log('静态文件恢复成功', 'backup')
      }

      await rm(tempDir, { recursive: true, force: true })

      return { message: '恢复成功' }
    } catch (error) {
      if (existsSync(tempDir)) {
        await rm(tempDir, { recursive: true, force: true })
      }
      Logger.error('恢复失败', 'backup', error)
      throw new InternalServerErrorException(
        '恢复失败: ' + (error instanceof Error ? error.message : String(error)),
      )
    }
  }
}
