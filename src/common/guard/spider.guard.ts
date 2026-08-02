import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common'
import { Observable } from 'rxjs'

import { isDev } from '~/global/env.global'

@Injectable()
export class SpiderGuard implements CanActivate {
  private readonly allowedAgents = [
    'qy-space',
    'baidu',
    'rss',
    'google',
    'bing',
    'chrome',
    'firefox',
    'safari',
    'edge',
    'opera',
    'postman',
    'insomnia',
  ]

  private readonly spiderPatterns = [
    /^Scrapy/i,
    /^python-requests/i,
    /^Python-urllib/i,
    /^Go-http-client/i,
    /^Java\//i,
    /^Apache-HttpClient/i,
  ]

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    if (isDev) return true

    const request = context.switchToHttp().getRequest()
    const headers = request.headers
    const user_agent: string = headers['user-agent'] || ''

    if (!user_agent) {
      return true
    }

    // 如果是已知的合法 User-Agent，直接放行
    const isAllowed = this.allowedAgents.some((agent) =>
      user_agent.toLowerCase().includes(agent),
    )
    if (isAllowed) return true

    // 仅精确匹配已知爬虫模式
    const isSpider = this.spiderPatterns.some((pattern) =>
      pattern.test(user_agent),
    )

    if (!isSpider) {
      return true
    }
    throw new ForbiddenException(`不可以使用爬虫哦，user-agent: ${user_agent}`)
  }
}
