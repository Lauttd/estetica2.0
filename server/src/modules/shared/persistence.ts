// =============================================================================
// KAYA KALPA — Traducción de errores de la base
// =============================================================================
// Prisma devuelve los choques contra índices únicos como un P2002 con el nombre
// de la columna, en inglés y en jerga:
//
//   Unique constraint failed on the fields: (`slug`)
//
// Eso no puede llegar al panel. §38 pide que ningún error interno salga al
// cliente, y además quien lo lea necesita saber QUÉ dato repetir —"Ya existe un
// servicio con ese nombre"—, no cómo se llama la columna.
//
// Se resuelve acá y no en cada repositorio porque la traducción es la misma para
// todas las tablas; lo único que cambia es el texto de cada campo.
// =============================================================================

import { Prisma } from '@prisma/client';
import { ConflictError } from '../../utils/errors';

/**
 * Qué campo único chocó.
 *
 * Hay que mirar dos formas del mismo dato porque Postgres no siempre informa lo
 * mismo: a veces `meta.target` es la lista de campos (`['slug']`) y a veces el
 * nombre del índice (`services_slug_key`). Por eso se compara por inclusión y no
 * por igualdad: "services_slug_key" contiene "slug".
 */
function matchedField(error: unknown, known: string[]): string | null {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return null;
  if (error.code !== 'P2002') return null;

  const target = (error.meta as { target?: string[] | string } | undefined)?.target;
  const candidates = Array.isArray(target) ? target : typeof target === 'string' ? [target] : [];
  if (candidates.length === 0) return null;

  // `known` se recorre en orden, así que si dos campos se llaman parecido gana el
  // que el módulo declaró primero.
  return (
    known.find((field) => candidates.some((candidate) => candidate.includes(field))) ??
    null
  );
}

/**
 * Convierte un choque contra un índice único en un 409 con un mensaje entendible.
 *
 * Se usa envolviendo la escritura, no comprobando antes con un `findUnique`: entre
 * la comprobación y el `create` hay una ventana en la que otro pedido puede
 * insertar el mismo valor, así que la única verificación que vale es la de la
 * base. Comprobar antes sería código de más que igual no evita la carrera.
 *
 *   try {
 *     return await prisma.service.create({ ... });
 *   } catch (error) {
 *     rethrowUniqueViolation(error, { slug: 'Ya existe un servicio con ese nombre.' });
 *   }
 *
 * Siempre lanza: o el 409 traducido, o el error original si no era un choque.
 * Está tipado como `never` para que quien llame no tenga que escribir un `return`
 * inalcanzable después.
 *
 * No hay mensaje de respaldo, y es a propósito: `matchedField` solo devuelve un
 * campo que ya esté en `messages`, así que si llegara a devolver `null` es
 * porque el choque no es de un campo que este módulo conozca. Inventar ahí un
 * "ese dato ya está en uso" sería afirmar algo que no se sabe.
 */
export function rethrowUniqueViolation(
  error: unknown,
  messages: Record<string, string>,
): never {
  const field = matchedField(error, Object.keys(messages));

  if (field === null) {
    // No era un P2002 —o sí, pero de un campo que este módulo no declaró—. Se
    // deja pasar tal cual: el manejador central lo convierte en un 500 genérico
    // antes que inventar un mensaje que podría ser falso.
    throw error;
  }

  throw new ConflictError(messages[field] as string, { cause: error });
}
