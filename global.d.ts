import type { Readable } from 'node:stream';
import type { Document, PaginateModel } from 'mongoose';

import type { ModelType } from '@typegoose/typegoose/lib/types';

declare global {
  export type KV<T = any> = Record<string, T>;

  export type MongooseModel<T> = ModelType<T> & PaginateModel<T & Document>;

  export const isDev: boolean;

  export const cwd: string;

  /**
   * 本地补全 Express.Multer.File 接口。
   * 说明：由于 @types/multer 2 采用 export = multer + declare global 的写法，
   * 在 @types/express 5 下命名空间合并不稳定，导致全局找不到
   * Express.Multer.File。这里直接在我们自己的 global.d.ts 中写入相同结构，
   * 确保类型可用。字段与 @types/multer/index.d.ts 保持一致。
   */
  namespace Express {
    namespace Multer {
      /** Object containing file metadata and access information. */
      interface File {
        /** Name of the form field associated with this file. */
        fieldname: string;
        /** Name of the file on the uploader's computer. */
        originalname: string;
        /** @deprecated since July 2015 @see RFC 7578, Section 4.7 */
        encoding: string;
        /** Value of the `Content-Type` header for this file. */
        mimetype: string;
        /** Size of the file in bytes. */
        size: number;
        /**
         * A readable stream of this file. Only available to the `_handleFile`
         * callback for custom `StorageEngine`s.
         */
        stream: Readable;
        /** DiskStorage only: Directory to which this file has been uploaded. */
        destination: string;
        /** DiskStorage only: Name of this file within `destination`. */
        filename: string;
        /** DiskStorage only: Full path to the uploaded file. */
        path: string;
        /** MemoryStorage only: A Buffer containing the entire file. */
        buffer: Buffer;
      }
    }
  }
}

export {};
