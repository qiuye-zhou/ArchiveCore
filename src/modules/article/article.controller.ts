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

import { ArticleService, EditorInfo } from './article.service'
import { Auth, Admin } from '~/common/decorator/auth.decorator'
import { GetRequestUser } from '~/common/decorator/user.decorator'
import { MongoIdDto } from '~/shared/dto/id.dto'
import { UserDocument } from '~/modules/user/user.model'
import {
  CreateArticleDto,
  QueryArticleDto,
  UpdateArticleDto,
} from './article.dto'

/** 从登录用户提取修改人信息 */
function toEditor(user: {
  id?: string
  _id?: any
  name?: string
  username?: string
}): EditorInfo {
  return {
    id: user.id ?? user._id?.toString() ?? '',
    name: user.name || user.username || '未知用户',
  }
}

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

  /** 回收站列表（需在 /:id 之前声明，否则会被动态路由吞掉） */
  @Get('/recycle')
  @Admin()
  async getRecycle(
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    return await this.articleService.getDeleted({ page, pageSize })
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
  async create(
    @GetRequestUser() user: UserDocument,
    @Body() createArticleDto: CreateArticleDto,
  ) {
    const editor = toEditor(user)
    return await this.articleService.create({
      ...createArticleDto,
      author: editor.id,
      lastModifiedBy: editor.id,
      lastModifiedByName: editor.name,
      modified: new Date(),
    })
  }

  @Patch('/:id')
  @Auth()
  async update(
    @GetRequestUser() user: UserDocument,
    @Param() { id }: MongoIdDto,
    @Body() updateArticleDto: UpdateArticleDto,
  ) {
    return await this.articleService.update(id, updateArticleDto, toEditor(user))
  }

  /** 历史版本列表 */
  @Get('/:id/revisions')
  @Auth()
  async listRevisions(@Param() { id }: MongoIdDto) {
    return await this.articleService.listRevisions(id)
  }

  /** 历史版本详情（含正文，用于预览） */
  @Get('/:id/revisions/:revisionId')
  @Auth()
  async getRevision(
    @Param() { id }: MongoIdDto,
    @Param('revisionId') revisionId: string,
  ) {
    return await this.articleService.getRevision(id, revisionId)
  }

  /** 回溯到指定历史版本 */
  @Post('/:id/revisions/:revisionId/restore')
  @Auth()
  async restoreRevision(
    @GetRequestUser() user: UserDocument,
    @Param() { id }: MongoIdDto,
    @Param('revisionId') revisionId: string,
  ) {
    return await this.articleService.restoreRevision(id, revisionId, toEditor(user))
  }

  @Delete('/:id')
  @Admin()
  async delete(
    @GetRequestUser() user: UserDocument,
    @Param() { id }: MongoIdDto,
  ) {
    await this.articleService.delete(id, toEditor(user))
    return
  }

  /** 从回收站恢复 */
  @Patch('/:id/restore')
  @Admin()
  async restore(@Param() { id }: MongoIdDto) {
    await this.articleService.restore(id)
    return
  }

  @Delete('/:id/permanent')
  @Admin()
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
