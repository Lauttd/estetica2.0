// =============================================================================
// KAYA KALPA — Formato de las respuestas
// =============================================================================
// Un solo lugar define la forma de la API, así ningún controlador inventa la
// suya:
//
//   éxito  ->  { data, meta? }
//   error  ->  { error: { code, message, details?, requestId } }
//
// `meta` solo aparece en listados con paginación.
// =============================================================================

import type { Response } from 'express';

export interface PaginationMeta {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}

export interface ResponseMeta {
  pagination?: PaginationMeta;
}

export function ok<T>(res: Response, data: T, meta?: ResponseMeta): void {
  res.status(200).json(meta ? { data, meta } : { data });
}

export function created<T>(res: Response, data: T): void {
  res.status(201).json({ data });
}

export function noContent(res: Response): void {
  res.status(204).end();
}

/** Arma el `meta.pagination` y valida que los números cierren. */
export function paginationMeta(
  page: number,
  perPage: number,
  total: number,
): ResponseMeta {
  return {
    pagination: {
      page,
      perPage,
      total,
      totalPages: perPage > 0 ? Math.ceil(total / perPage) : 0,
    },
  };
}
