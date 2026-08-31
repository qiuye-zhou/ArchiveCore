import { Injectable, Logger } from '@nestjs/common'
import * as os from 'os'
import { ReturnModelType } from '@typegoose/typegoose'

import { InjectModel } from '~/transformers/model.transformer'
import { ArticleModel } from '../article/article.model'
import { CategoryModel } from '../category/category.model'
import { UserModel } from '../user/user.model'

@Injectable()
export class AnalyzeService {
  constructor(
    @InjectModel(ArticleModel)
    private readonly articleModel: ReturnModelType<typeof ArticleModel>,
    @InjectModel(CategoryModel)
    private readonly categoryModel: ReturnModelType<typeof CategoryModel>,
    @InjectModel(UserModel)
    private readonly userModel: ReturnModelType<typeof UserModel>,
  ) {}

  async getOverview() {
    try {
      const [articlesCount, categoriesCount, userCount] = await Promise.all([
        this.articleModel.countDocuments({ isDeleted: false }),
        this.categoryModel.countDocuments(),
        this.userModel.countDocuments(),
      ])

      return {
        articles: articlesCount,
        categories: categoriesCount,
        users: userCount,
      }
    } catch (error) {
      Logger.error('获取概览数据失败', error, 'AnalyzeService')
      throw error
    }
  }

  async getArticleStats() {
    try {
      const stats = await this.articleModel.aggregate([
        {
          $group: {
            _id: {
              $dateToString: {
                format: '%Y-%m',
                date: '$created',
              },
            },
            count: { $sum: 1 },
          },
        },
        {
          $sort: { _id: 1 },
        },
      ])

      return stats
    } catch (error) {
      Logger.error('获取文章统计数据失败', error, 'AnalyzeService')
      throw error
    }
  }

  async getCategoryStats() {
    try {
      const articleColl =
        this.articleModel.collection?.collectionName ||
        this.articleModel.collection?.name ||
        'articles'

      const stats = await this.categoryModel.aggregate([
        {
          $lookup: {
            from: articleColl,
            let: { catIdStr: { $toString: '$_id' } },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ['$category', '$$catIdStr'] },
                  $or: [
                    { isDeleted: { $exists: false } },
                    { isDeleted: false },
                    { isDeleted: null },
                  ],
                },
              },
            ],
            as: 'articles',
          },
        },
        {
          $project: {
            name: 1,
            count: { $size: '$articles' },
          },
        },
        {
          $sort: { count: -1 },
        },
      ])

      return stats
    } catch (error) {
      Logger.error('获取分类统计数据失败', error, 'AnalyzeService')
      throw error
    }
  }

  async getRecentActivity(days: number = 7) {
    try {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - days)

      const groupByDate = {
        _id: {
          $dateToString: {
            format: '%Y-%m-%d',
            date: '$created',
          },
        },
        count: { $sum: 1 },
      }

      const [articleStats] = await Promise.all([
        this.articleModel.aggregate([
          {
            $match: { created: { $gte: cutoffDate }, isDeleted: { $ne: true } },
          },
          { $group: groupByDate },
          { $sort: { _id: 1 } },
        ]),
      ])

      // 合并为按日期聚合的数组
      const dateMap = new Map<
        string,
        {
          date: string
          articles: number
        }
      >()

      const ensureDate = (date: string) => {
        if (!dateMap.has(date)) {
          dateMap.set(date, {
            date,
            articles: 0,
          })
        }
        return dateMap.get(date)!
      }

      for (const item of articleStats) {
        ensureDate(item._id).articles = item.count
      }

      return Array.from(dateMap.values()).sort((a, b) =>
        a.date.localeCompare(b.date),
      )
    } catch (error) {
      Logger.error('获取最近活动数据失败', error, 'AnalyzeService')
      throw error
    }
  }

  async getSystemStats() {
    try {
      const formatMemory = (bytes: number) => {
        return (bytes / 1024 / 1024 / 1024).toFixed(2) + ' GB'
      }

      const formatUptime = (seconds: number) => {
        const days = Math.floor(seconds / 86400)
        const hours = Math.floor((seconds % 86400) / 3600)
        const minutes = Math.floor((seconds % 3600) / 60)
        const parts: string[] = []
        if (days > 0) parts.push(`${days} 天`)
        if (hours > 0) parts.push(`${hours} 小时`)
        if (minutes > 0) parts.push(`${minutes} 分钟`)
        return parts.join(' ') || '刚刚启动'
      }

      const cpus = os.cpus()
      const totalMemory = os.totalmem()
      const freeMemory = os.freemem()
      const usedMemory = totalMemory - freeMemory

      return {
        os: `${os.type()} ${os.release()}`,
        platform: os.platform(),
        arch: os.arch(),
        nodeVersion: process.version,
        uptime: formatUptime(os.uptime()),
        memoryUsage: formatMemory(usedMemory),
        totalMemory: formatMemory(totalMemory),
        freeMemory: formatMemory(freeMemory),
        cpuModel: cpus[0]?.model || 'Unknown',
        cpus: cpus.length,
        hostname: os.hostname(),
        version: process.env.npm_package_version || 'Unknown',
        env: process.env.NODE_ENV || 'development',
      }
    } catch (error) {
      Logger.error('获取系统统计数据失败', error, 'AnalyzeService')
      throw error
    }
  }
}
