import { ArticleModel } from '~/modules/article/article.model'
import { CategoryModel } from '~/modules/category/category.model'
import { ConfigOptionModel } from '~/modules/config/config.model'
import { UserModel } from '~/modules/user/user.model'
import { getProviderByTypegooseClass } from '~/transformers/model.transformer'

export const datebaseModules = [
  ArticleModel,
  UserModel,
  CategoryModel,
  ConfigOptionModel,
].map((module) => getProviderByTypegooseClass(module))
