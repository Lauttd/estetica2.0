// =============================================================================
// KAYA KALPA — Mensajes de validación en castellano
// =============================================================================
// Zod trae sus mensajes en inglés ("Required", "Invalid email") y estos textos
// terminan dentro de la respuesta de error, que el frontend muestra tal cual.
// Traducirlos acá, en un solo lugar, evita repetir un `message:` en cada campo de
// cada esquema — y evita que se escape un "Required" en medio de la web.
//
// Se instala solo con importar el módulo: `validate.ts` lo importa, y todas las
// rutas validadas pasan por ahí.
// =============================================================================

import { z, type ZodErrorMap } from 'zod';

const REQUIRED = 'Este dato es obligatorio.';
const WRONG_TYPE = 'El formato de este dato no es válido.';

/** Texto legible para las validaciones de string que trae Zod. */
function stringValidationMessage(validation: unknown): string {
  if (typeof validation === 'object' && validation !== null) {
    const rule = validation as Record<string, unknown>;
    if (typeof rule.startsWith === 'string') return `Debe empezar con "${rule.startsWith}".`;
    if (typeof rule.endsWith === 'string') return `Debe terminar con "${rule.endsWith}".`;
    if (typeof rule.includes === 'string') return `Debe contener "${rule.includes}".`;
    return 'El formato no es válido.';
  }

  switch (validation) {
    case 'email':
      return 'Ingresá un correo electrónico válido.';
    case 'url':
      return 'Ingresá una dirección web válida.';
    case 'uuid':
      return 'El identificador no es válido.';
    case 'datetime':
    case 'date':
    case 'time':
      return 'Ingresá una fecha u hora válida.';
    case 'regex':
      return 'El formato no es válido.';
    case 'ip':
    case 'cidr':
      return 'Ingresá una dirección IP válida.';
    default:
      return 'El formato no es válido.';
  }
}

const spanishErrorMap: ZodErrorMap = (issue) => {
  switch (issue.code) {
    case z.ZodIssueCode.invalid_type:
      // Distinguir "falta" de "está mal escrito" le ahorra al usuario tener que
      // adivinar cuál de los dos problemas tiene.
      return {
        message: issue.received === 'undefined' ? REQUIRED : WRONG_TYPE,
      };

    case z.ZodIssueCode.invalid_literal:
      return { message: `El único valor admitido es ${JSON.stringify(issue.expected)}.` };

    case z.ZodIssueCode.unrecognized_keys:
      return { message: 'Se enviaron datos que no corresponden a esta operación.' };

    case z.ZodIssueCode.invalid_union:
      return { message: 'El formato de este dato no es válido.' };

    case z.ZodIssueCode.invalid_enum_value:
      return {
        message: `Tiene que ser uno de estos valores: ${issue.options.join(', ')}.`,
      };

    case z.ZodIssueCode.invalid_arguments:
    case z.ZodIssueCode.invalid_return_type:
      return { message: 'Error interno de validación.' };

    case z.ZodIssueCode.invalid_date:
      return { message: 'Ingresá una fecha válida.' };

    case z.ZodIssueCode.invalid_string:
      return { message: stringValidationMessage(issue.validation) };

    case z.ZodIssueCode.too_small: {
      if (issue.type === 'string') {
        return issue.minimum === 1
          ? { message: 'Este dato no puede quedar vacío.' }
          : { message: `Tiene que tener al menos ${issue.minimum} caracteres.` };
      }
      if (issue.type === 'array') {
        return { message: `Elegí al menos ${issue.minimum} opción(es).` };
      }
      return { message: `El valor mínimo es ${issue.minimum}.` };
    }

    case z.ZodIssueCode.too_big: {
      if (issue.type === 'string') {
        return { message: `No puede superar los ${issue.maximum} caracteres.` };
      }
      if (issue.type === 'array') {
        return { message: `Elegí como máximo ${issue.maximum} opción(es).` };
      }
      return { message: `El valor máximo es ${issue.maximum}.` };
    }

    case z.ZodIssueCode.not_multiple_of:
      return { message: `Tiene que ser múltiplo de ${issue.multipleOf}.` };

    case z.ZodIssueCode.not_finite:
      return { message: 'El número no es válido.' };

    default:
      // Los `custom` ya traen su propio mensaje en castellano desde el esquema.
      return { message: issue.message ?? 'El dato no es válido.' };
  }
};

z.setErrorMap(spanishErrorMap);
