import { Transform } from 'class-transformer'
import { IsNumber, IsOptional } from 'class-validator'

export class PaginationDto {
  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => {
    const num = parseInt(value)
    return isNaN(num) || num < 1 ? 1 : num
  })
  page?: number

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => {
    const num = parseInt(value)
    return isNaN(num) || num < 1 ? 10 : num
  })
  pageSize?: number
}

export interface PaginatedResult<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}
