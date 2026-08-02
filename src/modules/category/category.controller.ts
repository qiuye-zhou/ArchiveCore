import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common'

import { CategoryService } from './category.service'
import { Auth } from '~/common/decorator/auth.decorator'
import { MongoIdDto } from '~/shared/dto/id.dto'
import { PaginationDto } from '~/shared/dto/pagination.dto'
import {
  BodyCategoryModel,
  QueryTagAndCategoryDto,
  SignOrIdDto,
} from './category.dto'

@Controller('category')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Get('/all')
  async getCategories(
    @Query() query: QueryTagAndCategoryDto,
    @Query() pagination: PaginationDto,
  ) {
    return await this.categoryService.getAll(
      query.istag ? true : undefined,
      pagination.page,
      pagination.pageSize,
    )
  }

  @Get('/:query')
  async getCategoryById(@Param() { query }: SignOrIdDto) {
    if (!query) {
      throw new BadRequestException('查询参数不能为空')
    }
    return await this.categoryService.getByIdOrSign(query)
  }

  @Post('/add')
  @Auth()
  async create(@Body() body: BodyCategoryModel) {
    const { name, type, sign } = body
    return this.categoryService.create(name, type, sign)
  }

  @Patch('/:id')
  @Auth()
  async patch(@Param() params: MongoIdDto, @Body() body: BodyCategoryModel) {
    const { id } = params
    return await this.categoryService.update(id, body)
  }

  @Delete('/:id')
  @Auth()
  async deleteCategory(@Param() params: MongoIdDto) {
    const { id } = params
    return await this.categoryService.deleteById(id)
  }
}
