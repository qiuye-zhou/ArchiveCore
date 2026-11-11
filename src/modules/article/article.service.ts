import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { ReturnModelType } from '@typegoose/typegoose'
import * as archiver from 'archiver'

import { InjectModel } from '~/transformers/model.transformer'
import { ArticleModel } from './article.model'
import { ArticleRevisionModel } from './article-revision.model'
import { paginate } from '~/shared/utils/paginate'
import { PaginatedResult } from '~/shared/dto/pagination.dto'

/** 触发历史快照的字段：仅标题/正文变化时才记录版本 */
const TRACKED_FIELDS = ['title', 'content'] as const

/** 修改人信息（由 controller 从登录态注入） */
export interface EditorInfo {
  id: string
  name: string
}

@Injectable()
export class ArticleService {
  constructor(
    @InjectModel(ArticleModel)
    private readonly articleModel: ReturnModelType<typeof ArticleModel>,
    @InjectModel(ArticleRevisionModel)
    private readonly revisionModel: ReturnModelType<typeof ArticleRevisionModel>,
  ) {}

  async getAll(query: {
    category?: string
    tag?: string
    author?: string
    page?: number
    pageSize?: number
  }): Promise<PaginatedResult<ArticleModel>> {
    const { category, tag, author, page = 1, pageSize = 10 } = query

    const filter: any = { isDeleted: false }
    if (category) {
      filter.category = category
    }
    if (tag) {
      filter.tags = tag
    }
    if (author) {
      filter.author = author
    }

    return paginate<ArticleModel>(this.articleModel, filter, page, pageSize)
  }

  async getById(id: string) {
    const article = await this.articleModel.findById(id).lean()
    if (!article) {
      throw new NotFoundException('文档不存在')
    }
    return article
  }

  async getBySlug(slug: string) {
    const article = await this.articleModel
      .findOne({ slug, isDeleted: false })
      .lean()
    if (!article) {
      throw new NotFoundException('文档不存在')
    }
    return article
  }

  /**
   * 生成一个高概率全局唯一的 slug（base36 时间戳 + base36 随机片段）
   * 格式示例：mzqdpf3-a9x2kr（不依赖中文标题，避免 slugify 对中文得到空串）
   */
  private generateDefaultSlug(): string {
    const ts = Date.now().toString(36)
    const rand = Math.random().toString(36).slice(2, 8).padEnd(6, '0')
    return `${ts}-${rand}`
  }

  async create(articleData: Partial<ArticleModel>) {
    const data = { ...articleData }

    // 若前端未传 slug（或传空串），自动生成一个唯一默认值，
    // 既避免 MongoDB unique index 下的 slug:null 重复冲突，
    // 也为未来基于 slug 的公开访问路径预留字段。
    const hasSlug = typeof data.slug === 'string' && data.slug.trim().length > 0
    if (!hasSlug) {
      data.slug = this.generateDefaultSlug()
    } else {
      // 用户显式指定 slug 时，先检查唯一性
      const existingArticle = await this.articleModel.findOne({
        slug: data.slug,
      })
      if (existingArticle) {
        throw new BadRequestException('文档slug已存在')
      }
    }

    const article = await this.articleModel.create({
      ...data,
      content: data.content ?? '',
      views: 0,
    })
    return article
  }

  async update(
    id: string,
    articleData: Partial<ArticleModel>,
    editor?: EditorInfo,
  ) {
    const article = await this.articleModel.findById(id)
    if (!article) {
      throw new NotFoundException('文档不存在')
    }

    if (articleData.slug && articleData.slug !== article.slug) {
      const existingArticle = await this.articleModel.findOne({
        slug: articleData.slug,
        _id: { $ne: id },
      })
      if (existingArticle) {
        throw new BadRequestException('文档slug已存在')
      }
    }

    // 仅当标题/正文实际变化时才记录修改人、修改时间并生成历史快照
    const contentChanged = TRACKED_FIELDS.some(
      (f) => articleData[f] !== undefined && articleData[f] !== article[f],
    )

    const updatePayload: Record<string, any> = { ...articleData }
    if (contentChanged) {
      updatePayload.modified = new Date()
      if (editor) {
        updatePayload.lastModifiedBy = editor.id
        updatePayload.lastModifiedByName = editor.name
      }
    }

    const updatedArticle = await this.articleModel
      .findByIdAndUpdate(id, updatePayload, { new: true })
      .lean()

    if (contentChanged && updatedArticle) {
      await this.revisionModel.create({
        articleId: id,
        title: updatedArticle.title ?? '',
        content: updatedArticle.content ?? '',
        editorId: editor?.id,
        editorName: editor?.name ?? '未知用户',
      })
    }

    return updatedArticle
  }

  /** 文档历史版本列表（新的在前，不含正文，避免列表过大） */
  async listRevisions(articleId: string) {
    const article = await this.articleModel.findById(articleId).lean()
    if (!article) {
      throw new NotFoundException('文档不存在')
    }
    const revisions = await this.revisionModel
      .find({ articleId })
      .sort({ created: -1 })
      .select('-content')
      .lean()
    return revisions.map((r) => ({
      id: r._id.toString(),
      title: r.title,
      editorId: r.editorId,
      editorName: r.editorName,
      created: r.created,
    }))
  }

  /** 单个历史版本详情（含正文，用于预览/回溯） */
  async getRevision(articleId: string, revisionId: string) {
    const revision = await this.revisionModel
      .findOne({ _id: revisionId, articleId })
      .lean()
    if (!revision) {
      throw new NotFoundException('历史版本不存在')
    }
    return {
      id: revision._id.toString(),
      articleId: revision.articleId,
      title: revision.title,
      content: revision.content,
      editorId: revision.editorId,
      editorName: revision.editorName,
      created: revision.created,
    }
  }

  /** 回溯到指定历史版本：用该版本的标题/正文覆盖当前文档（本身也会产生一条新快照） */
  async restoreRevision(
    articleId: string,
    revisionId: string,
    editor?: EditorInfo,
  ) {
    const revision = await this.getRevision(articleId, revisionId)
    return this.update(
      articleId,
      { title: revision.title, content: revision.content },
      editor,
    )
  }

  async delete(id: string) {
    const article = await this.articleModel.findById(id)
    if (!article) {
      throw new NotFoundException('文档不存在')
    }

    await this.articleModel.findByIdAndUpdate(id, { isDeleted: true })
    return
  }

  async permanentlyDelete(id: string) {
    const result = await this.articleModel.deleteOne({ _id: id })
    if (result.deletedCount === 0) {
      throw new NotFoundException('文档不存在')
    }
    return
  }

  async incrementViews(id: string) {
    await this.articleModel.findByIdAndUpdate(id, { $inc: { views: 1 } })
    return
  }

  async getByCategory(categoryId: string, page = 1, pageSize = 10) {
    return this.getAll({
      category: categoryId,
      page,
      pageSize,
    })
  }

  async getByTag(tagId: string, page = 1, pageSize = 10) {
    return this.getAll({ tag: tagId, page, pageSize })
  }

  /**
   * 导入 Markdown 文件为文档
   * @param filename 文件名（含扩展名），去除 .md 后作为标题
   * @param content 文件文本内容
   * @param categoryId 可选所属文件夹 ID
   */
  async importMarkdown(filename: string, content: string, categoryId?: string) {
    const title = filename.replace(/\.md$/i, '').trim() || '未命名文档'
    return this.create({
      title,
      content,
      category: categoryId,
    })
  }

  /**
   * 导出单个文档为 Markdown
   * @returns { filename, content }
   */
  async exportMarkdown(id: string) {
    const article = await this.articleModel.findById(id).lean()
    if (!article) {
      throw new NotFoundException('文档不存在')
    }
    const safeTitle = (article.title || '未命名').replace(/[\\/:*?"<>|]/g, '_')
    return {
      filename: `${safeTitle}.md`,
      content: article.content || '',
    }
  }

  /**
   * 导出全部文档为 zip 包（每个文档一个 .md 文件）
   * @returns Buffer
   */
  async exportAllAsZip(): Promise<Buffer> {
    const articles = await this.articleModel
      .find({ isDeleted: false })
      .sort({ created: -1 })
      .lean()

    return new Promise<Buffer>((resolve, reject) => {
      const archive = archiver('zip', { zlib: { level: 9 } })
      const chunks: Buffer[] = []

      archive.on('data', (chunk: Buffer) => chunks.push(chunk))
      archive.on('end', () => resolve(Buffer.concat(chunks)))
      archive.on('error', reject)

      for (const article of articles) {
        const safeTitle = (article.title || '未命名').replace(
          /[\\/:*?"<>|]/g,
          '_',
        )
        archive.append(article.content || '', {
          name: `${safeTitle}.md`,
        })
      }

      archive.finalize()
    })
  }
}
