import { Module } from '@nestjs/common'

import { ArticleController } from './article.controller'
import { ArticleService } from './article.service'
import { AuthModule } from '../auth/auth.module'

@Module({
  controllers: [ArticleController],
  providers: [ArticleService],
  exports: [ArticleService],
  imports: [AuthModule],
})
export class ArticleModule {}
