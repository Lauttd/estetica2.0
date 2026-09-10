// =============================================================================
// KAYA KALPA — Manejador central de errores
// =============================================================================
// Es el único lugar que decide qué ve el cliente cuando algo sale mal. Va
// registrado al final de todo, así recibe los errores de cualquier ruta.
//
// La regla del prompt (§38) es no devolver errores internos al cliente. Acá se
// cumple de la forma estricta: **solo** los `AppError` exponen su mensaje,
// porque son los únicos escritos a mano pensando en el usuario. Cualquier otra
// excepción —un bug, un fallo de Prisma, un TypeError— se convierte en un 500
// genérico y el detalle real queda únicamente en el log del servidor.
//
// El `requestId` que acompaña cada error es el puente entre las dos cosas: el
// usuario ve un mensaje corto, y con ese id se encuentra la traza completa.
// =============================================================================

import type { ErrorRequestHandler } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { logger } from '../config/logger';
import { isBookingOverlapError } from '../config/prisma';
import {
  AppError,
  ErrorCode,
  isAppError,
  type ErrorCodeValue,
  type ErrorDetail,
} from '../utils/errors';

interface ErrorPayload {
  code: ErrorCodeValue;
  message: string;
  details?: ErrorDetail[];
  requestId: string;
}

const GENERIC_MESSAGE =
  'Ocurrió un error inesperado. Volvé a intentar en unos minutos.';

export const errorHandler: ErrorRequestHandler = (error, req, res, next) => {
  // Si la respuesta ya empezó a salir (una descarga cortada, por ejemplo) no se
  // puede escribir una respuesta de error: se delega y Express cierra la
  // conexión, que es lo único que queda por hacer.
  if (res.headersSent) {
    next(error);
    return;
  }

  const requestId = req.requestId ?? 'desconocido';

  const { status, payload, logAs, logMessage } = classify(error, requestId);

  if (logAs === 'error') {
    logger.error(
      {
        err: error,
        requestId,
        method: req.method,
        url: req.originalUrl,
        status,
      },
      logMessage,
    );
  } else {
    // Los errores de operación son parte del funcionamiento normal: alguien
    // mandó un dato inválido o pidió algo que no existe. Se registran sin stack
    // para que no tapen los problemas de verdad.
    logger.warn(
      {
        requestId,
        method: req.method,
        url: req.originalUrl,
        status,
        code: payload.code,
        message: payload.message,
      },
      logMessage,
    );
  }

  res.status(status).json({ error: payload });
};

interface Classification {
  status: number;
  payload: ErrorPayload;
  logAs: 'warn' | 'error';
  logMessage: string;
}

function classify(error: unknown, requestId: string): Classification {
  // 1. Errores de la aplicación: ya traen mensaje y código pensados para el
  //    cliente.
  if (isAppError(error)) {
    const payload: ErrorPayload = {
      code: error.code,
      message: error.message,
      requestId,
    };
    if (error.details && error.details.length > 0) {
      payload.details = error.details;
    }
    return {
      status: error.statusCode,
      payload,
      // Un 5xx propio sigue siendo un problema del servidor aunque sea esperado.
      logAs: error.statusCode >= 500 ? 'error' : 'warn',
      logMessage: error.message,
    };
  }

  // 2. Zod. No debería llegar hasta acá (el middleware `validate` lo convierte
  //    antes en un BadRequest), pero si un controlador parsea por su cuenta, el
  //    usuario merece un 400 con detalle y no un 500.
  if (error instanceof ZodError) {
    return {
      status: 400,
      payload: {
        code: ErrorCode.VALIDATION_ERROR,
        message: 'Revisá los datos ingresados.',
        details: error.issues.map((issue) => ({
          field: issue.path.map(String).join('.') || '(raíz)',
          message: issue.message,
        })),
        requestId,
      },
      logAs: 'warn',
      logMessage: 'Datos inválidos detectados fuera del middleware de validación',
    };
  }

  // 3. Errores conocidos de Prisma, traducidos a algo que tenga sentido para
  //    quien usa la web.
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    const mapped = mapPrismaError(error, requestId);
    if (mapped) return mapped;
  }

  // 4. El doble turno. Se comprueba aparte porque el constraint se creó a mano
  //    en una migración y Prisma no lo tiene en su schema, así que no llega con
  //    un código P2002 de los que sí sabe traducir.
  //
  //    Llegar acá significa que la verificación previa de disponibilidad pasó
  //    pero el turno se ocupó en el medio. Es un caso de uso real (dos personas
  //    reservando a la vez), no un bug: el 409 con SLOT_TAKEN es la respuesta
  //    correcta y el wizard vuelve al paso de elegir horario.
  if (isBookingOverlapError(error)) {
    return {
      status: 409,
      payload: {
        code: ErrorCode.SLOT_TAKEN,
        message: 'Ese horario se acaba de ocupar. Elegí otro, por favor.',
        requestId,
      },
      logAs: 'warn',
      logMessage: 'Turno rechazado por el constraint de solapamiento',
    };
  }

  // 5. Cuerpo de la petición mal formado o demasiado grande. Los lanza el
  //    parser de Express antes de llegar a las rutas.
  const parserError = mapBodyParserError(error, requestId);
  if (parserError) return parserError;

  // 6. Cualquier otra cosa: un bug. No se expone nada.
  return {
    status: 500,
    payload: {
      code: ErrorCode.INTERNAL_ERROR,
      message: GENERIC_MESSAGE,
      requestId,
    },
    logAs: 'error',
    logMessage: 'Error no controlado',
  };
}

function mapPrismaError(
  error: Prisma.PrismaClientKnownRequestError,
  requestId: string,
): Classification | null {
  const fail = (message: string, code: ErrorCodeValue): Classification => ({
    status: code === ErrorCode.NOT_FOUND ? 404 : 409,
    payload: { code, message, requestId },
    logAs: 'warn',
    logMessage: `Prisma ${error.code}: ${message}`,
  });

  switch (error.code) {
    case 'P2002': {
      // Violación de índice único. El mensaje nombra el campo cuando Prisma lo
      // informa, que es más útil que un "ya existe" a secas.
      const target = error.meta?.target;
      const fields = Array.isArray(target) ? target.join(', ') : undefined;
      return fail(
        fields
          ? `Ya hay un registro con ese valor en: ${fields}.`
          : 'Ese dato ya está registrado.',
        ErrorCode.CONFLICT,
      );
    }

    case 'P2025':
      return fail('No encontramos el registro que querés modificar.', ErrorCode.NOT_FOUND);

    case 'P2003':
      return fail('El dato hace referencia a algo que no existe.', ErrorCode.CONFLICT);

    case 'P2000':
      return fail('Uno de los valores es demasiado largo.', ErrorCode.VALIDATION_ERROR);

    default:
      return null;
  }
}

function mapBodyParserError(
  error: unknown,
  requestId: string,
): Classification | null {
  if (typeof error !== 'object' || error === null) return null;

  const { type, status } = error as { type?: string; status?: number };

  if (type === 'entity.too.large') {
    return {
      status: 413,
      payload: {
        code: ErrorCode.VALIDATION_ERROR,
        message: 'El contenido enviado es demasiado grande.',
        requestId,
      },
      logAs: 'warn',
      logMessage: 'Cuerpo de la petición demasiado grande',
    };
  }

  if (type === 'entity.parse.failed') {
    return {
      status: 400,
      payload: {
        code: ErrorCode.VALIDATION_ERROR,
        message: 'El contenido enviado no tiene un formato válido.',
        requestId,
      },
      logAs: 'warn',
      logMessage: 'JSON mal formado en el cuerpo de la petición',
    };
  }

  if (status === 400 || status === 413) {
    return {
      status,
      payload: {
        code: ErrorCode.VALIDATION_ERROR,
        message: 'No pudimos leer el contenido enviado.',
        requestId,
      },
      logAs: 'warn',
      logMessage: 'Petición rechazada por el parser',
    };
  }

  return null;
}

/** Se exporta para poder verificar en un test que nada filtra el stack. */
export const INTERNAL_ERROR_MESSAGE = GENERIC_MESSAGE;

/** Reexportado para que `errorHandler` y los controladores usen la misma clase. */
export { AppError };
