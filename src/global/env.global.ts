import {
  devJWTConfig,
  devMONGO_DB,
  devPORT_CONFIG,
  devREDIS,
  devURL_CORS_Arr,
} from '../config/dev.config'
import {
  proJWTConfig,
  proMONGO_DB,
  proPORT_CONFIG,
  proREDIS,
  proURL_CORS_Arr,
} from '../config/pro.config'

export const isTest = !!process.env.NODE_TEST

export const isDev = process.env.NODE_ENV == 'development'

export const envPORT = isDev ? devPORT_CONFIG : proPORT_CONFIG

export const envMONGO_DB = isDev ? devMONGO_DB : proMONGO_DB

export const envREDIS = isDev ? devREDIS : proREDIS

export const cwd = process.cwd()

export const envURL_CORS_Arr = isDev ? devURL_CORS_Arr : proURL_CORS_Arr

export const JWTConfig = isDev ? devJWTConfig : proJWTConfig
