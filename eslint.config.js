const js = require('@eslint/js');
const typescript = require('typescript-eslint');
const prettier = require('eslint-config-prettier');
const jest = require('eslint-plugin-jest');
const globals = require('globals');

module.exports = [
    {
        ignores: ['dist/', 'build/', 'node_modules/', '*.d.ts', 'coverage/'],
    },
    js.configs.recommended,
    ...typescript.configs.recommended,
    {
        files: ['**/*.{js,mjs,cjs,ts}'],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            globals: {
                ...globals.node,
                ...globals.es2020,
            },
            parser: typescript.parser,
            parserOptions: {
                ecmaVersion: 'latest',
                sourceType: 'module',
                project: './tsconfig.json',
            },
        },
        plugins: {
            '@typescript-eslint': typescript.plugin,
            jest,
        },
        rules: {
            indent: ['error', 4],
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/no-unused-vars': 'warn',
            '@typescript-eslint/no-unused-expressions': 'off',
            'no-console': 'warn',
            'no-debugger': 'warn',
        },
    },
    {
        files: ['**/*.test.{js,ts}', '**/*.spec.{js,ts}'],
        languageOptions: {
            globals: {
                ...globals.jest,
            },
        },
        plugins: {
            jest,
        },
        rules: {
            ...jest.configs.recommended.rules,
            '@typescript-eslint/no-explicit-any': 'off',
        },
    },
    prettier,
]; 