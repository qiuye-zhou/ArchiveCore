import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common'

import { ArticleService } from './article.service'
import { Auth } from '~/common/decorator/auth.decorator'
import { MongoIdDto } from '~/shared/dto/id.dto'
import {
  CreateArticleDto,
  QueryArticleDto,
  UpdateArticleDto,
} from './article.dto'

@Controller('article')
export class ArticleController {
  constructor(private readonly articleService: ArticleService) {}

  @Get('/all')
  async getAll(@Query() query: QueryArticleDto) {
    return await this.articleService.getAll({
      published: query.published !== undefined ? !!query.published : undefined,
      category: query.category,
      tag: query.tag,
      author: query.author,
      page: query.page,
      pageSize: query.pageSize,
    })
  }

  @Get('/published')
  async getPublishedArticles(
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    return await this.articleService.getPublishedArticles(page, pageSize)
  }

  @Get('/drafts')
  @Auth()
  async getDrafts(
    @Query('author') author?: string,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    return await this.articleService.getDrafts(author, page, pageSize)
  }

  @Get('/category/:categoryId')
  async getByCategory(
    @Param('categoryId') categoryId: string,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    return await this.articleService.getByCategory(categoryId, page, pageSize)
  }

  @Get('/tag/:tagId')
  async getByTag(
    @Param('tagId') tagId: string,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    return await this.articleService.getByTag(tagId, page, pageSize)
  }

  @Get('/slug/:slug')
  async getBySlug(@Param('slug') slug: string) {
    return await this.articleService.getBySlug(slug)
  }

  @Get('/:id')
  async getById(@Param() { id }: MongoIdDto) {
    return await this.articleService.getById(id)
  }

  @Post('/add')
  @Auth()
  async create(@Body() createArticleDto: CreateArticleDto) {
    return await this.articleService.create(createArticleDto)
  }

  @Patch('/:id')
  @Auth()
  async update(
    @Param() { id }: MongoIdDto,
    @Body() updateArticleDto: UpdateArticleDto,
  ) {
    return await this.articleService.update(id, updateArticleDto)
  }

  @Delete('/:id')
  @Auth()
  async delete(@Param() { id }: MongoIdDto) {
    await this.articleService.delete(id)
    return
  }

  @Delete('/:id/permanent')
  @Auth()
  @HttpCode(204)
  async permanentlyDelete(@Param() { id }: MongoIdDto) {
    await this.articleService.permanentlyDelete(id)
    return
  }

  @Post('/:id/views')
  async incrementViews(@Param() { id }: MongoIdDto) {
    await this.articleService.incrementViews(id)
    return
  }
}
