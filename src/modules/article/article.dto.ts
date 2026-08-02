import { Transform } from 'class-transformer'
import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator'

import { ArticleStatusEnum } from './article.model'

export class CreateArticleDto {
  @IsString()
  @IsNotEmpty()
  title!: string

  @IsString()
  @IsNotEmpty()
  content!: string

  @IsString()
  @IsOptional()
  summary?: string

  @IsString()
  @IsOptional()
  category?: string

  @IsArray()
  @IsOptional()
  tags?: string[]

  @IsNumber()
  @IsOptional()
  status?: ArticleStatusEnum

  @IsString()
  @IsOptional()
  slug?: string
}

export class UpdateArticleDto {
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  title?: string

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  content?: string

  @IsString()
  @IsOptional()
  summary?: string

  @IsString()
  @IsOptional()
  category?: string

  @IsArray()
  @IsOptional()
  tags?: string[]

  @IsNumber()
  @IsOptional()
  status?: ArticleStatusEnum

  @IsString()
  @IsOptional()
  slug?: string

  @IsBoolean()
  @IsOptional()
  isDeleted?: boolean
}

export class QueryArticleDto {
  @IsOptional()
  @Transform(({ value: val }) => {
    if (val === '1' || val === 'true') {
      return true
    }
    if (val === '0' || val === 'false') {
      return false
    }
    return val
  })
  isTag?: boolean | string

  @IsOptional()
  @Transform(({ value: val }) => {
    if (val === '1' || val === 'true') {
      return true
    }
    if (val === '0' || val === 'false') {
      return false
    }
    return val
  })
  published?: boolean | string

  @IsOptional()
  @IsString()
  category?: string

  @IsOptional()
  @IsString()
  tag?: string

  @IsOptional()
  @IsString()
  author?: string

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseInt(value))
  page?: number

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseInt(value))
  pageSize?: number
}
