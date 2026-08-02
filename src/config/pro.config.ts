//**production 环境配置**/

export const proPORT_CONFIG = 3666

export const proMONGO_DB = {
  dbName: process.env.MONGO_DB_NAME || 'archive',
  host: process.env.MONGO_HOST || '127.0.0.1',
  port: +(process.env.MONGO_PORT || 27017),
  user: process.env.MONGO_USER || '',
  password: process.env.MONGO_PASSWORD || '',
  get uri() {
    const userPassword =
      this.user && this.password ? `${this.user}:${this.password}@` : ''
    return `mongodb://${userPassword}${this.host}:${this.port}/${this.dbName}`
  },
}

export const proREDIS = {
  host: process.env.REDIS_HOST || 'localhost',
  port: +(process.env.REDIS_PORT || 6379),
  password: process.env.REDIS_PASSWORD || null,
  ttl: null,
  httpCacheTTL: +(process.env.REDIS_HTTP_CACHE_TTL || 15),
  max: 120,
  disableApiCache: false,
}

export const proJWTConfig = {
  jwt_secret: process.env.JWT_SECRET || 'jwtsecretpro',
  jwt_expire: +(process.env.JWT_EXPIRE || 14),
}

// 前端请求 源地址允许访问控制 CORS
export const proURL_CORS_Arr = [
  'http://localhost:3030',
  'http://localhost:3040',
]
