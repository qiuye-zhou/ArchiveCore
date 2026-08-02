import { Module } from '@nestjs/common'

import { AnalyzeController } from './analyze.controller'
import { AnalyzeService } from './analyze.service'
import { ArticleModule } from '../article/article.module'
import { CategoryModule } from '../category/category.module'
import { UserModule } from '../user/user.module'

@Module({
  controllers: [AnalyzeController],
  exports: [AnalyzeService],
  providers: [AnalyzeService],
  imports: [ArticleModule, CategoryModule, UserModule],
})
export class AnalyzeModule {}
