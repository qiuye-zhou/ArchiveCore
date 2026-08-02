import { Module } from '@nestjs/common'

import { CategoryController } from './category.controller'
import { CategoryService } from './category.service'
import { AuthModule } from '../auth/auth.module'

@Module({
  controllers: [CategoryController],
  providers: [CategoryService],
  exports: [CategoryService],
  imports: [AuthModule],
})
export class CategoryModule {}
