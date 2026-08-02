import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { ReturnModelType } from '@typegoose/typegoose'

import { InjectModel } from '~/transformers/model.transformer'
import { ArticleModel, ArticleStatusEnum } from './article.model'
import { paginate } from '~/shared/utils/paginate'
import { PaginatedResult } from '~/shared/dto/pagination.dto'

@Injectable()
export class ArticleService {
  constructor(
    @InjectModel(ArticleModel)
    private readonly articleModel: ReturnModelType<typeof ArticleModel>,
  ) {}

  async getAll(query: {
    published?: boolean
    category?: string
    tag?: string
    author?: string
    page?: number
    pageSize?: number
  }): Promise<PaginatedResult<ArticleModel>> {
    const { published, category, tag, author, page = 1, pageSize = 10 } = query

    const filter: any = { isDeleted: false }
    if (published !== undefined) {
      filter.status = published
        ? ArticleStatusEnum.Published
        : ArticleStatusEnum.Draft
    }
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
      throw new NotFoundException('文章不存在')
    }
    return article
  }

  async getBySlug(slug: string) {
    const article = await this.articleModel
      .findOne({ slug, isDeleted: false })
      .lean()
    if (!article) {
      throw new NotFoundException('文章不存在')
    }
    return article
  }

  async create(articleData: Partial<ArticleModel>) {
    if (articleData.slug) {
      const existingArticle = await this.articleModel.findOne({
        slug: articleData.slug,
      })
      if (existingArticle) {
        throw new BadRequestException('文章slug已存在')
      }
    }

    const article = await this.articleModel.create({
      ...articleData,
      views: 0,
    })
    return article
  }

  async update(id: string, articleData: Partial<ArticleModel>) {
    const article = await this.articleModel.findById(id)
    if (!article) {
      throw new NotFoundException('文章不存在')
    }

    if (articleData.slug && articleData.slug !== article.slug) {
      const existingArticle = await this.articleModel.findOne({
        slug: articleData.slug,
        _id: { $ne: id },
      })
      if (existingArticle) {
        throw new BadRequestException('文章slug已存在')
      }
    }

    const updatedArticle = await this.articleModel
      .findByIdAndUpdate(id, articleData, { new: true })
      .lean()
    return updatedArticle
  }

  async delete(id: string) {
    const article = await this.articleModel.findById(id)
    if (!article) {
      throw new NotFoundException('文章不存在')
    }

    await this.articleModel.findByIdAndUpdate(id, { isDeleted: true })
    return
  }

  async permanentlyDelete(id: string) {
    const result = await this.articleModel.deleteOne({ _id: id })
    if (result.deletedCount === 0) {
      throw new NotFoundException('文章不存在')
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
      published: true,
      page,
      pageSize,
    })
  }

  async getByTag(tagId: string, page = 1, pageSize = 10) {
    return this.getAll({ tag: tagId, published: true, page, pageSize })
  }

  async getPublishedArticles(page = 1, pageSize = 10) {
    return this.getAll({ published: true, page, pageSize })
  }

  async getDrafts(author?: string, page = 1, pageSize = 10) {
    return this.getAll({ published: false, author, page, pageSize })
  }
}
