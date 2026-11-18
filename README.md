# ArchiveCore

在线文档系统 **ArchiveCore** 后端服务，基于 NestJS 11 构建，为前端 [ArchiveWeb](../ArchiveWeb) 提供接口。

- 前端仓库（同目录）：[../ArchiveWeb](../ArchiveWeb) · [GitHub](https://github.com/qiuye-zhou/ArchiveWeb)
- 本项目仓库：[GitHub](https://github.com/qiuye-zhou/ArchiveCore)

> 完整系统 = 本后端（:3666）+ [ArchiveWeb](../ArchiveWeb) 前端（:3030）。前端开发时通过 Vite 代理把 `/api` 转发到本服务。

## 技术栈

| 类别 | 选型 |
| --- | --- |
| 框架 | NestJS 11、TypeScript |
| 数据库 | MongoDB + Mongoose + Typegoose |
| 缓存 / 实时 | Redis（cache-manager）+ Socket.IO Redis Adapter |
| 鉴权 | JWT（jsonwebtoken）+ bcryptjs |
| 日志 | winston + winston-daily-rotate-file |
| 文件 / 备份 | multer、archiver（zip） |
| 安全 | helmet、express-rate-limit、CORS 白名单 |

## 功能特性

- **初始化引导**：首次启动创建管理员账号与站点配置（`/init`）
- **用户与权限**：`admin` / `editor` 两种角色，用户管理、密码重置、会话管理仅管理员可用
- **文档管理**：Markdown 正文、分类树、标签、slug、浏览量；软删除进入回收站
- **历史版本**：每次更新自动留存版本，可查看与回溯，并记录最后修改人 / 时间
- **回收站**：列表、恢复、永久删除（永久删除时同步清理历史版本）
- **导入导出**：单篇 Markdown 导出、Markdown 导入、全部文档打包 zip
- **数据统计**：总览、文章、分类、最近动态、系统状态
- **备份与恢复**：生成备份、列表、上传备份、恢复、删除
- **配置中心**：默认配置、校验、单项/批量更新、重置、热重载
- **健康检查与日志**：服务状态、日志列表、尾读大文件（只读末尾 1MB）、下载、清理；日志按日轮转、20MB 上限、归档压缩
- **统一输出**：全局响应包装 `{ code, message, data }`、全局异常过滤、参数校验管道

## 目录结构

```
src/
├─ modules/          # 业务模块
│  ├─ user/          # 登录、注册、资料、用户管理
│  ├─ article/       # 文档、历史版本、回收站、导入导出
│  ├─ category/      # 分类（树/平铺）
│  ├─ analyze/       # 数据统计
│  ├─ backup/        # 备份与恢复
│  ├─ config/        # 站点配置中心
│  ├─ init/          # 初始化引导
│  ├─ health/        # 健康检查、日志、定时任务
│  └─ auth/          # token 刷新
├─ processors/       # 数据库、Redis、日志、网关、helper
├─ common/           # 守卫、装饰器、拦截器、过滤器、中间件、管道
├─ config/           # dev / pro 环境配置
├─ shared/           # 通用模型、DTO、分页等工具
└─ bootstrap.ts      # 启动入口（helmet、限流、CORS、全局管道）
```

## 快速开始

环境要求：

- Node.js >= 20
- MongoDB >= 6
- Redis >= 6（缓存与 Socket.IO 适配器）

```bash
pnpm install
pnpm dev          # 开发模式，监听 http://127.0.0.1:3666
```

启动后打开前端 [ArchiveWeb](../ArchiveWeb)（默认 http://localhost:3030），未初始化时会自动跳转初始化页面，创建管理员账号后即可登录使用。

### 常用脚本

| 命令 | 说明 |
| --- | --- |
| `pnpm dev` | 开发模式（watch，NODE_ENV=development） |
| `pnpm build` | 编译到 `dist/` |
| `pnpm pro` | 以生产模式运行 `dist/main` |
| `pnpm lint` | ESLint 检查并修复 |
| `pnpm format` | Prettier 格式化 |
| `pnpm test` | 单元测试（Jest） |
| `pnpm test:e2e` | 端到端测试 |

## 配置说明

开发环境配置位于 [src/config/dev.config.ts](src/config/dev.config.ts)，生产环境位于 [src/config/pro.config.ts](src/config/pro.config.ts)。

| 配置项 | 开发默认值 | 生产环境变量 |
| --- | --- | --- |
| 服务端口 | `3666` | `PORT`（默认 3666） |
| MongoDB | `mongodb://127.0.0.1:27017/archive` | `MONGO_HOST` / `MONGO_PORT` / `MONGO_DB_NAME` / `MONGO_USER` / `MONGO_PASSWORD` |
| Redis | `localhost:6379` | `REDIS_HOST` / `REDIS_PORT` / `REDIS_PASSWORD` / `REDIS_HTTP_CACHE_TTL` |
| JWT | `jwtsecretdev`，14 天 | `JWT_SECRET` / `JWT_EXPIRE` |
| CORS 白名单 | `http://localhost:3030`、`http://localhost:3040` | 同左（`proURL_CORS_Arr`） |

> 生产环境务必修改 `JWT_SECRET`，并按需收紧 CORS 白名单。

安全相关默认策略（[src/bootstrap.ts](src/bootstrap.ts)）：helmet 安全响应头、每 IP 15 分钟 300 次限流、CORS 携带凭证。

## 接口概览

后端本身不带 `/api` 前缀，前端通过 Vite 代理把 `/api` 去掉后转发到本服务。主要路由：

| 模块 | 代表接口 |
| --- | --- |
| 用户 | `POST /user/login`、`GET /user/profile`、`PATCH /user/update`、`GET /user/all`、`POST /user/create`、`PATCH /user/:id/password`、`DELETE /user/:id` |
| 文档 | `GET /article/all`、`GET /article/:id`、`POST /article/add`、`PATCH /article/:id`、`DELETE /article/:id` |
| 历史版本 | `GET /article/:id/revisions`、`GET /article/:id/revisions/:revisionId`、`POST /article/:id/revisions/:revisionId/restore` |
| 回收站 | `GET /article/recycle`、`PATCH /article/:id/restore`、`DELETE /article/:id/permanent` |
| 导入导出 | `GET /article/:id/export`、`GET /article/export/all`、`POST /article/import` |
| 分类 | `GET /category/tree`、`GET /category/flat`、`POST /category/add`、`PATCH /category/:id`、`DELETE /category/:id` |
| 统计 | `GET /analyze/overview`、`GET /analyze/article`、`GET /analyze/category`、`GET /analyze/recent`、`GET /analyze/system` |
| 备份 | `GET /backup/new`、`GET /backup/all`、`POST /backup/restore`、`DELETE /backup/:filename` |
| 配置 | `GET /config/getconfig`、`PATCH /config/:key`、`POST /config/batch`、`POST /config/reload` |
| 初始化 | `GET /init/status`、`POST /init`、`PATCH /init/config` |
| 健康 / 日志 | `GET /health/check`、`GET /health/log`、`GET /health/log/:filename`、`GET /health/log/:filename/download` |

- 受保护接口需携带 `Authorization: Bearer <token>`
- 管理员专属接口在控制器上使用 `@Admin()`，非管理员返回 403
- 成功响应由拦截器统一包装为 `{ code: 0 | 200, message, data }`

## 与 ArchiveWeb 前端配合

```
浏览器 ──> ArchiveWeb 前端 (:3030, Vite)
              │  /api/**（代理并去掉 /api 前缀，支持 ws）
              ▼
          ArchiveCore 后端 (:3666)
              ├─> MongoDB（文档、用户、历史版本、配置）
              └─> Redis（缓存、Socket.IO 适配器）
```

1. 先启动本服务，再启动 [ArchiveWeb](../ArchiveWeb)
2. 前端请求统一走 `axios` 实例，自动注入 token、解包响应
3. 后端不可达（断网 / 502 / 503 / 504）时，前端会跳转独立的网络错误页

前端使用说明见 [ArchiveWeb README](../ArchiveWeb/README.md)。
