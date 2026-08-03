import { BadRequestException, Injectable, OnModuleInit } from '@nestjs/common'
import { ReturnModelType } from '@typegoose/typegoose'

import { InjectModel } from '~/transformers/model.transformer'
import { CategoryModel, CategoryTypeEnum } from './category.model'
import { ArticleModel } from '../article/article.model'
import { paginate } from '~/shared/utils/paginate'
import { PaginatedResult } from '~/shared/dto/pagination.dto'

/** 树形节点：文件夹可包含子文件夹 */
export interface CategoryTreeNode extends CategoryModel {
  children: CategoryTreeNode[]
}

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
      filter.type = isTag ? CategoryTypeEnum.Tag : CategoryTypeEnum.Folder
    }
    return paginate<CategoryModel>(this.categoryModel, filter, page, pageSize)
  }

  /** 获取全部分类（扁平），供前端自行组装树 */
  async getAllFlat(): Promise<CategoryModel[]> {
    return this.categoryModel.find().sort({ order: 1, created: -1 }).lean()
  }

  /** 获取树形结构（仅 Folder 类型参与树，Tag 平铺返回不进树） */
  async getTree(): Promise<CategoryTreeNode[]> {
    const all = (await this.categoryModel
      .find()
      .sort({ order: 1, created: -1 })
      .lean()) as Array<CategoryModel & { _id: { toString(): string } }>
    const folderNodes = all.filter((n) => n.type !== CategoryTypeEnum.Tag)
    const map = new Map<string, CategoryTreeNode>()
    const nodes: CategoryTreeNode[] = folderNodes.map((n) => {
      const node = { ...n, children: [] } as CategoryTreeNode
      map.set(String(n._id), node)
      return node
    })
    const roots: CategoryTreeNode[] = []
    nodes.forEach((n) => {
      if (n.parentId && map.has(String(n.parentId))) {
        map.get(String(n.parentId))!.children.push(n)
      } else {
        roots.push(n)
      }
    })
    return roots
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

  async create(
    name: string,
    type: number,
    sign?: string,
    parentId?: string | null,
    order?: number,
  ) {
    // 校验父级存在性
    if (parentId) {
      const parent = await this.categoryModel.findById(parentId)
      if (!parent) {
        throw new BadRequestException('父级文件夹不存在')
      }
    }
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
      parentId: parentId ?? null,
      order: order ?? 0,
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

    // 防止将自身设为父级
    if (partialData.parentId && String(partialData.parentId) === id) {
      throw new BadRequestException('不能将自身设为父级')
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

    // 检查是否存在子文件夹
    const childCount = await this.categoryModel.countDocuments({
      parentId: id,
    })
    if (childCount > 0) {
      throw new BadRequestException('该文件夹下存在子文件夹，无法删除')
    }

    // 检查是否存在关联文档
    const relatedArticles = await this.articleModel.find({
      $or: [{ category: id }, { tags: id }],
      isDeleted: false,
    })
    if (relatedArticles.length > 0) {
      throw new BadRequestException('该分类下存在文档，无法删除')
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
        name: '默认文件夹',
        sign: 'default',
        type: CategoryTypeEnum.Folder,
        parentId: null,
        order: 0,
      })
    }
  }
}
