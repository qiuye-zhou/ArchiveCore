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

  @prop({ unique: true, trim: true })
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
}
