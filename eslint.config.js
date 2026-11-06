// @ts-check
const eslint = require('@eslint/js');
const { defineConfig } = require('eslint/config');
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');
const boundaries = require('eslint-plugin-boundaries');

/**
 * Quy tắc kiến trúc (xem README "Dữ liệu & state"):
 *  - Chỉ file *.api.ts trong feature được dùng HttpClient.
 *  - Feature không tự tạo state toàn cục (providedIn: 'root'), trừ *.api.ts (không giữ state).
 *  - Component trình bày (thư mục ui/) không inject store / API.
 *  - Feature chỉ dùng base qua public API (shared/<x>/index.ts) và không import feature khác.
 */
module.exports = defineConfig([
  {
    files: ['**/*.ts'],
    extends: [
      eslint.configs.recommended,
      tseslint.configs.recommended,
      tseslint.configs.stylistic,
      angular.configs.tsRecommended,
    ],
    processor: angular.processInlineTemplates,
    rules: {
      '@angular-eslint/directive-selector': [
        'error',
        { type: 'attribute', prefix: ['app', 'df'], style: 'camelCase' },
      ],
      // df- = component nội bộ của base dynamic-form (type, wrapper)
      '@angular-eslint/component-selector': [
        'error',
        { type: 'element', prefix: ['app', 'df'], style: 'kebab-case' },
      ],
    },
  },
  {
    files: ['**/*.html'],
    extends: [angular.configs.templateRecommended, angular.configs.templateAccessibility],
    rules: {},
  },

  // ───────────── Kiến trúc: feature ─────────────
  {
    files: ['src/app/features/**/*.ts'],
    ignores: ['**/*.api.ts', '**/*.spec.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@angular/common/http',
              message:
                'Gọi API qua <feature>.api.ts và store, không dùng HttpClient trong component.',
            },
          ],
          patterns: [
            {
              group: ['**/shared/*/**'],
              message: 'Chỉ import base qua public API: shared/dynamic-form, shared/data hoặc shared/workflow.',
            },
          ],
        },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: "Property[key.name='providedIn'][value.value='root']",
          message:
            'Feature không tạo state toàn cục. Store của màn hình khai báo trong providers của component trang; state toàn app thuộc core/.',
        },
      ],
    },
  },
  {
    // Component trình bày: chỉ input / output.
    files: ['src/app/**/ui/**/*.ts'],
    ignores: ['**/*.spec.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/*.store', '**/*.api', '@ngrx/*', '@angular/common/http'],
              message: 'Component trong ui/ chỉ nhận input và phát output, không dùng store / API.',
            },
          ],
        },
      ],
    },
  },

  // ───────────── Kiến trúc: phụ thuộc giữa các khối ─────────────
  {
    files: ['src/app/**/*.ts'],
    ignores: ['**/*.spec.ts'],
    plugins: { boundaries },
    settings: {
      'import/resolver': { node: { extensions: ['.ts', '.js'] } },
      'boundaries/include': ['src/app/**/*.ts'],
      'boundaries/elements': [
        { type: 'shared', pattern: 'src/app/shared/*', capture: ['lib'] },
        { type: 'core', pattern: 'src/app/core' },
        { type: 'feature', pattern: 'src/app/features/*', capture: ['feature'] },
        { type: 'mock', pattern: 'src/app/mock' },
        { type: 'app', pattern: 'src/app/*.ts', mode: 'file' },
      ],
    },
    rules: {
      'boundaries/element-types': [
        'error',
        {
          default: 'disallow',
          message: '${file.type} không được import ${dependency.type} (xem README: kiến trúc)',
          rules: [
            { from: 'shared', allow: ['shared'] },
            { from: 'core', allow: ['shared', 'core'] },
            {
              from: 'feature',
              allow: ['shared', 'core', ['feature', { feature: '${from.feature}' }]],
            },
            { from: 'mock', allow: ['shared', 'core', 'feature', 'mock'] },
            { from: 'app', allow: ['shared', 'core', 'feature', 'mock', 'app'] },
          ],
        },
      ],
    },
  },
]);
