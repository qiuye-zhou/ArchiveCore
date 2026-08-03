import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator'
import { index, modelOptions, prop, DocumentType } from '@typegoose/typegoose'

import { BaseModel } from '~/shared/model/base.model'

export type CategoryDocument = DocumentType<CategoryModel>

/**
 * 分类类型
 * - Folder: 文件夹（用于文档树形组织）
 * - Tag: 标签（可选的扁平分类）
 */
export enum CategoryTypeEnum {
  Folder,
  Tag,
}

@index({ sign: -1 })
@index({ parentId: 1 })
@modelOptions({ options: { customName: 'Category' } })
export class CategoryModel extends BaseModel {
  @prop({ unique: true, trim: true, required: true })
  @IsString()
  @IsNotEmpty()
  name!: string

  @prop({ default: CategoryTypeEnum.Folder })
  @IsEnum(CategoryTypeEnum)
  @IsOptional()
  type?: CategoryTypeEnum

  @prop({ unique: true, required: true })
  @IsString()
  @IsNotEmpty()
  sign!: string

  /** 父级文件夹 ID，null/undefined 表示根节点 */
  @prop({ type: String, ref: 'Category', default: null })
  @IsString()
  @IsOptional()
  parentId?: string | null

  /** 同级排序，越小越靠前 */
  @prop({ default: 0 })
  @IsOptional()
  order?: number
}
