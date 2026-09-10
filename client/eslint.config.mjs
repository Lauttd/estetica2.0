// =============================================================================
// KAYA KALPA (cliente) — Configuración de ESLint
// =============================================================================
// Formato "flat config", el único que entiende ESLint 9. Se llama `.mjs` para
// que sea módulo sin depender del `type` del package.json.
// =============================================================================

import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**'] },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,

      /**
       * `no-undef` se apaga en archivos de TypeScript.
       *
       * TypeScript ya comprueba que cada identificador exista y conoce los
       * tipos; la regla solo aporta falsos positivos con los globales del
       * navegador —`window`, `document`— porque ESLint no los conoce si no se le
       * declaran uno por uno. Es la recomendación explícita de typescript-eslint.
       */
      'no-undef': 'off',

      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],

      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'no-console': 'error',

      /**
       * Las reglas de los hooks son errores y no advertencias.
       *
       * Un hook mal usado —una dependencia que falta, un hook dentro de un
       * condicional— no se ve al leer el código y produce bugs que aparecen
       * meses después como "a veces muestra datos viejos". Es exactamente la
       * clase de error que conviene que frene el build.
       */
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      /**
       * Vite recarga el módulo entero cuando un archivo exporta algo que no sea
       * un componente. Es una advertencia y no un error porque hay archivos que
       * legítimamente exportan las dos cosas.
       */
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
    },
  },
);
