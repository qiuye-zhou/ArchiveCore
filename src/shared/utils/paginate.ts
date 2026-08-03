import { PaginatedResult } from '../dto/pagination.dto'

export async function paginate<T>(
  model: any,
  filter: Record<string, any> = {},
  page = 1,
  pageSize = 10,
  sort: Record<string, 1 | -1> = { created: -1 },
): Promise<PaginatedResult<T>> {
  const currentPage = isNaN(page) || page < 1 ? 1 : page
  const currentPageSize = isNaN(pageSize) || pageSize < 1 ? 10 : pageSize
  const skip = (currentPage - 1) * currentPageSize

  const [data, total] = await Promise.all([
    model.find(filter).sort(sort).skip(skip).limit(currentPageSize).lean(),
    model.countDocuments(filter),
  ])

  return {
    list: data,
    total,
    page: currentPage,
    pageSize: currentPageSize,
    totalPages: Math.ceil(total / currentPageSize),
  }
}
