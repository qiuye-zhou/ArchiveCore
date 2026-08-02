import eslintPluginTypescript from '@typescript-eslint/eslint-plugin'
import tseslint from 'typescript-eslint'
import prettier from 'eslint-plugin-prettier'
import prettierConfig from 'eslint-config-prettier'
import tsParser from '@typescript-eslint/parser'

export default [
  ...tseslint.configs.recommended,
  {
    files: ['{src,test}/**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: './tsconfig.json',
        sourceType: 'module',
      },
    },
    plugins: {
      prettier: prettier,
      '@typescript-eslint': eslintPluginTypescript,
    },
    rules: {
      ...prettierConfig.rules,
      'prettier/prettier': 'error',
      semi: ['error', 'never'], // 禁止使用分号
      // ESLint 推荐规则
      'no-unused-vars': 'off', // 关闭基础规则，使用 TypeScript 版本
      'no-undef': 'off', // TypeScript 编译器会处理这个
      // TypeScript ESLint 推荐规则
      ...eslintPluginTypescript.configs.recommended.rules,
      // 自定义规则覆盖
      '@typescript-eslint/interface-name-prefix': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'off', // 临时禁用这个规则
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/ban-types': 'off', // 禁用这个规则
      '@typescript-eslint/no-unsafe-function-type': 'off', // 禁用这个规则
    },
  },
  // 为声明文件设置单独的规则
  {
    files: ['**/*.d.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off'
    }
  },
  // 忽略的文件和目录
  {
    ignores: ['dist/'],
  },
]