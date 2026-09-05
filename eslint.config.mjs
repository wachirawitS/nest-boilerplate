// @ts-check
import eslint from '@eslint/js';
import checkFile from 'eslint-plugin-check-file';
import importPlugin from 'eslint-plugin-import';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['eslint.config.mjs'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      sourceType: 'commonjs',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    files: ['{src,test}/**/*.ts'],
    plugins: {
      'check-file': checkFile,
      import: importPlugin,
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-unsafe-argument': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/consistent-type-definitions': ['error', 'type'],
      'check-file/no-index': 'error',
      'check-file/filename-naming-convention': [
        'error',
        { '**/*.ts': 'KEBAB_CASE' },
        { ignoreMiddleExtensions: true },
      ],
      'check-file/folder-naming-convention': [
        'error',
        { '{src,test}/**/': 'KEBAB_CASE' },
      ],
      'import/no-default-export': 'error',
      'no-restricted-syntax': [
        'error',
        {
          selector: 'TSEnumDeclaration',
          message: 'Use a const object plus a union type.',
        },
        {
          selector: "CallExpression[callee.name='forwardRef']",
          message: 'Analyse the business boundary; forwardRef() is forbidden.',
        },
      ],
      'prettier/prettier': 'error',
    },
  },
  {
    files: ['src/migrations/*.ts'],
    rules: {
      'check-file/filename-naming-convention': 'off',
    },
  },
  {
    files: ['src/**/*.ts'],
    ignores: ['src/config/**/*.ts'],
    rules: {
      'no-restricted-properties': [
        'error',
        {
          object: 'process',
          property: 'env',
          message: 'Read environment variables only under src/config/.',
        },
      ],
    },
  },
  {
    files: ['src/modules/*/controllers/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['../repositories/*', '../entities/*', '../clients/*'] },
            {
              group: [
                '../../*/repositories/*',
                '../../*/entities/*',
                '../../*/clients/*',
                '../../*/controllers/*',
                '../../*/dto/*',
              ],
            },
          ],
          paths: [
            {
              name: 'typeorm',
              message: 'Controllers must not access persistence APIs.',
            },
            {
              name: '@nestjs/axios',
              message: 'Axios belongs in module clients/.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/modules/*/services/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [{ group: ['../dto/*', '../controllers/*'] }],
          paths: [
            {
              name: '@nestjs/axios',
              message: 'Axios belongs in module clients/.',
            },
            {
              name: 'typeorm',
              importNames: [
                'Repository',
                'QueryBuilder',
                'SelectQueryBuilder',
                'InsertQueryBuilder',
                'UpdateQueryBuilder',
                'DeleteQueryBuilder',
              ],
              message:
                'TypeORM query APIs belong in module repositories/.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/modules/*/repositories/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['../controllers/*', '../services/*', '../dto/*'] },
            {
              group: [
                '../../*/controllers/*',
                '../../*/services/*',
                '../../*/repositories/*',
                '../../*/entities/*',
                '../../*/dto/*',
                '../../*/clients/*',
              ],
            },
          ],
        },
      ],
    },
  },
);
