// =============================================================================
// KAYA KALPA (servidor) — Configuración de ESLint
// =============================================================================
// Formato "flat config", el único que entiende ESLint 9. Se llama `.mjs` para
// que sea módulo sin depender del `type` del package.json, que acá es CommonJS
// porque el servidor compila a CommonJS.
// =============================================================================

import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  // `dist` es lo que genera `tsc`, no lo que se escribe.
  { ignores: ['dist/**', 'node_modules/**', 'src/generated/**'] },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    files: ['**/*.ts'],
    rules: {
      /**
       * `no-undef` se apaga en archivos de TypeScript.
       *
       * No es una regla que se relaje por comodidad: TypeScript ya comprueba que
       * cada identificador exista y, además, conoce los tipos. La regla solo
       * aporta falsos positivos con los globales de Node —`process`, `__dirname`—
       * porque ESLint no los conoce si no se le declaran uno por uno.
       *
       * Es la recomendación explícita de typescript-eslint.
       */
      'no-undef': 'off',

      /**
       * Un `any` explícito tiene que estar justificado.
       *
       * El prompt prohíbe el código sin tipos (§39) y un `any` es la forma más
       * silenciosa de romper eso: desactiva la comprobación de todo lo que toca.
       * Queda como advertencia y no como error porque hay lugares donde es
       * legítimo —el manejo de un error de una librería ajena, por ejemplo—, y
       * convertirlo en error empujaría a castings peores para callarlo.
       */
      '@typescript-eslint/no-explicit-any': 'warn',

      /**
       * Un parámetro sin usar es código muerto salvo que empiece con `_`, que es
       * la convención para decir "lo recibo porque la firma lo pide, pero no lo
       * uso" — el `next` de un middleware de error de Express, por ejemplo.
       */
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],

      // Comparar siempre con `===`. La coerción de `==` es una fuente de bugs
      // silenciosos y no hay ningún caso en este código donde haga falta.
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'no-console': 'error',
    },
  },
);
