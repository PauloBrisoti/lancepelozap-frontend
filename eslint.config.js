import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      // O projeto não usa React Compiler: as regras de análise de compilação
      // geram falsos positivos (carga de dados em useEffect é o padrão do app).
      'react-hooks/immutability': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/static-components': 'off',
      'react-hooks/purity': 'off',
      'react-hooks/preserve-manual-memoization': 'off',
      'react-hooks/exhaustive-deps': 'warn',
      // `any` é usado deliberadamente em integrações e mocks.
      '@typescript-eslint/no-explicit-any': 'warn',
      // Parâmetros com `_` (ex.: indices de map) são intencionais.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', caughtErrors: 'none', destructuredArrayIgnorePattern: '^_' },
      ],
      // `catch {}` silencioso é usado deliberadamente (logout, checkStatus, etc.).
      'no-empty': ['error', { allowEmptyCatch: true }],
    },
  },
])
