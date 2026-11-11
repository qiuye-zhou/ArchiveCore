import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsArray,
  IsBoolean,
  IsNumber,
} from 'class-validator'
import { index, modelOptions, prop } from '@typegoose/typegoose'

import { BaseModel } from '~/shared/model/base.model'

@index({ title: 'text', content: 'text' })
@modelOptions({ options: { customName: 'Article' } })
export class ArticleModel extends BaseModel {
  @prop({ required: true, trim: true })
  @IsString()
  @IsNotEmpty()
  title!: string

  @prop({ default: '' })
  @IsString()
  @IsOptional()
  content?: string

  @prop()
  @IsString()
  @IsOptional()
  summary?: string

  @prop({ type: String, ref: 'Category' })
  @IsString()
  @IsOptional()
  category?: string

  @prop({ type: String, ref: 'Category', default: [] })
  @IsArray()
  @IsOptional()
  tags?: string[]

  @prop({ default: 0 })
  @IsNumber()
  @IsOptional()
  views?: number

  @prop({ unique: true, sparse: true, trim: true })
  @IsString()
  @IsOptional()
  slug?: string

  @prop({ default: false })
  @IsBoolean()
  @IsOptional()
  isDeleted?: boolean

  @prop({ type: String, ref: 'User' })
  @IsString()
  @IsOptional()
  author?: string

  /** 最后修改人用户 id */
  @prop({ type: String, ref: 'User' })
  @IsString()
  @IsOptional()
  lastModifiedBy?: string

  /** 最后修改人显示名（冗余存储，用户被删后仍可展示） */
  @prop()
  @IsString()
  @IsOptional()
  lastModifiedByName?: string

  /** 最后修改时间（updatedAt 语义，update 时手动维护） */
  @prop()
  @IsOptional()
  modified?: Date
}
