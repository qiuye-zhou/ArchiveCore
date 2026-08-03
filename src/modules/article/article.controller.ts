import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'

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
      category: query.category,
      tag: query.tag,
      author: query.author,
      page: query.page,
      pageSize: query.pageSize,
    })
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

  /** 导出全部文档为 zip */
  @Get('/export/all')
  @Auth()
  @Header('Content-Type', 'application/zip')
  @Header('Content-Disposition', `attachment; filename="articles.zip"`)
  async exportAll(@Res() res) {
    const buffer = await this.articleService.exportAllAsZip()
    res.end(buffer)
    return
  }

  /** 导入 Markdown 文件 */
  @Post('/import')
  @Auth()
  @UseInterceptors(FileInterceptor('file'))
  async importMarkdown(
    @UploadedFile() file: Express.Multer.File,
    @Body('categoryId') categoryId?: string,
  ) {
    if (!file) {
      throw new Error('未接收到文件')
    }
    const content = file.buffer.toString('utf8')
    return await this.articleService.importMarkdown(
      file.originalname,
      content,
      categoryId,
    )
  }

  @Get('/:id')
  async getById(@Param() { id }: MongoIdDto) {
    return await this.articleService.getById(id)
  }

  /** 导出单个文档为 Markdown */
  @Get('/:id/export')
  async exportMarkdown(@Param() { id }: MongoIdDto, @Res() res) {
    const { filename, content } = await this.articleService.exportMarkdown(id)
    res.setHeader('Content-Type', 'text/markdown; charset=utf-8')
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(filename)}"`,
    )
    res.send(content)
    return
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
