import { index, modelOptions, prop } from '@typegoose/typegoose'

import { BaseModel } from '~/shared/model/base.model'

/**
 * 文档历史版本
 * 每次保存（内容或标题变化）时生成一条快照，用于历史回溯与恢复。
 */
@index({ articleId: 1, created: -1 })
@modelOptions({ options: { customName: 'ArticleRevision' } })
export class ArticleRevisionModel extends BaseModel {
  /** 所属文档 id */
  @prop({ required: true })
  articleId!: string

  /** 该版本的标题快照 */
  @prop({ default: '' })
  title!: string

  /** 该版本的内容快照 */
  @prop({ default: '' })
  content!: string

  /** 修改人用户 id */
  @prop()
  editorId?: string

  /** 修改人显示名（冗余，用户被删后仍可展示） */
  @prop({ default: '未知用户' })
  editorName!: string
}
