import { BadRequestException, Injectable, OnModuleInit } from '@nestjs/common'
import { ReturnModelType } from '@typegoose/typegoose'

import { InjectModel } from '~/transformers/model.transformer'
import { CategoryModel, CategoryTypeEnum } from './category.model'
import { ArticleModel } from '../article/article.model'
import { paginate } from '~/shared/utils/paginate'
import { PaginatedResult } from '~/shared/dto/pagination.dto'

@Injectable()
export class CategoryService implements OnModuleInit {
  constructor(
    @InjectModel(CategoryModel)
    private readonly categoryModel: ReturnModelType<typeof CategoryModel>,
    @InjectModel(ArticleModel)
    private readonly articleModel: ReturnModelType<typeof ArticleModel>,
  ) {}

  async onModuleInit() {
    await this.createDefaultCategory()
  }

  async getAll(
    isTag?: boolean,
    page = 1,
    pageSize = 10,
  ): Promise<PaginatedResult<CategoryModel>> {
    const filter: any = {}
    if (isTag !== undefined) {
      filter.type = isTag ? CategoryTypeEnum.Tag : CategoryTypeEnum.Category
    }
    return paginate<CategoryModel>(this.categoryModel, filter, page, pageSize)
  }

  async getByIdOrSign(query: string) {
    const { isValidObjectId } = await import('mongoose')
    const isId = isValidObjectId(query)
    const res = isId
      ? await this.categoryModel.findById(query).sort({ created: -1 }).lean()
      : await this.categoryModel
          .findOne({ sign: query })
          .sort({ created: -1 })
          .lean()

    if (!res) {
      throw new BadRequestException('分类不存在')
    }
    return { data: { ...res, children: '待写：属于该分类或tag的文章' } }
  }

  async create(name: string, type: number, sign?: string) {
    const existingCategory = await this.categoryModel.findOne({
      $or: [{ name }, { sign: sign ?? name }],
    })
    if (existingCategory) {
      throw new BadRequestException('分类名称或标识已存在')
    }
    const res = await this.categoryModel.create({
      name,
      type,
      sign: sign ?? name,
    })
    return res
  }

  async update(id: string, partialData: Partial<CategoryModel>) {
    const category = await this.categoryModel.findById(id)
    if (!category) {
      throw new BadRequestException('分类不存在')
    }

    if (partialData.name && partialData.name !== category.name) {
      const existingCategory = await this.categoryModel.findOne({
        name: partialData.name,
        _id: { $ne: id },
      })
      if (existingCategory) {
        throw new BadRequestException('分类名称已存在')
      }
    }

    if (partialData.sign && partialData.sign !== category.sign) {
      const existingCategory = await this.categoryModel.findOne({
        sign: partialData.sign,
        _id: { $ne: id },
      })
      if (existingCategory) {
        throw new BadRequestException('分类标识已存在')
      }
    }

    const updatedCategory = await this.categoryModel
      .findByIdAndUpdate(id, partialData, { new: true })
      .lean()
    return updatedCategory
  }

  async deleteById(id: string): Promise<any> {
    const category = await this.categoryModel.findById(id)
    if (!category) {
      throw new BadRequestException('该分类不存在')
    }

    const relatedArticles = await this.articleModel.find({
      $or: [{ category: id }, { tags: id }],
      isDeleted: false,
    })

    if (relatedArticles.length > 0) {
      throw new BadRequestException('该分类下存在文章，无法删除')
    }

    const result = await this.categoryModel.deleteOne({ _id: category._id })
    if ((await this.categoryModel.countDocuments({})) === 0) {
      await this.createDefaultCategory()
    }
    return result
  }

  private async createDefaultCategory() {
    if ((await this.categoryModel.countDocuments()) === 0) {
      return await this.categoryModel.create({
        name: '默认分类',
        sign: 'default',
      })
    }
  }
}
