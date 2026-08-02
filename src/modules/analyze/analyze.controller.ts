import { Controller, Get, Query } from '@nestjs/common'

import { AnalyzeService } from './analyze.service'
import { Auth } from '~/common/decorator/auth.decorator'

@Controller('analyze')
@Auth()
export class AnalyzeController {
  constructor(private readonly analyzeService: AnalyzeService) {}

  @Get('/overview')
  async getOverview() {
    return this.analyzeService.getOverview()
  }

  @Get('/article')
  async getArticleStats() {
    return this.analyzeService.getArticleStats()
  }

  @Get('/category')
  async getCategoryStats() {
    return this.analyzeService.getCategoryStats()
  }

  @Get('/recent')
  async getRecentActivity(@Query('days') days: number = 7) {
    return this.analyzeService.getRecentActivity(days)
  }

  @Get('/system')
  async getSystemStats() {
    return this.analyzeService.getSystemStats()
  }

  @Get('/all')
  async getAllStats() {
    const [overview, articleStats, categoryStats, systemStats] =
      await Promise.all([
        this.analyzeService.getOverview(),
        this.analyzeService.getArticleStats(),
        this.analyzeService.getCategoryStats(),
        this.analyzeService.getSystemStats(),
      ])

    return {
      overview,
      article: articleStats,
      category: categoryStats,
      system: systemStats,
    }
  }
}
