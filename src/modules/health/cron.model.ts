import { prop, modelOptions } from '@typegoose/typegoose'
import { BaseModel } from '~/shared/model/base.model'

export enum CronStatus {
  Active = 'active',
  Inactive = 'inactive',
}

@modelOptions({
  schemaOptions: {
    collection: 'cron',
  },
})
export class CronModel extends BaseModel {
  @prop({ required: true, unique: true })
  name: string

  @prop({ required: true })
  schedule: string

  @prop({ required: true })
  handler: string

  @prop({ default: CronStatus.Active })
  status: CronStatus

  @prop()
  lastRun: Date

  @prop()
  lastError: string

  @prop({ default: Date.now })
  created: Date

  @prop()
  description: string
}
