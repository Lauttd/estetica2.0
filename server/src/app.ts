// =============================================================================
// KAYA KALPA — Aplicación Express
// =============================================================================
// Arma la cadena de middlewares. El orden importa y está comentado en cada paso:
//
//   seguridad -> parsers -> contexto -> rutas -> 404 -> errores
//
// El manejador de errores va último: Express reconoce un middleware de error por
// tener cuatro argumentos, y solo recibe los errores de lo que se registró antes.
// =============================================================================

import express, { type Express } from 'express';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { env } from './config/env';
import { logger } from './config/logger';
import { errorHandler } from './middlewares/errorHandler';
import { notFound } from './middlewares/notFound';
import { requestContext } from './middlewares/requestContext';
import { apiRouter } from './routes';
import { ForbiddenError } from './utils/errors';

/** Un cuerpo de petición más grande que esto no es un caso legítimo de la API. */
const BODY_LIMIT = '100kb';

export function createApp(): Express {
  const app = express();

  // Express anuncia su versión en cada respuesta y eso solo le sirve a quien
  // busca versiones con vulnerabilidades conocidas.
  app.disable('x-powered-by');

  // `1` y no `true`: confiar en todos los saltos permite que un cliente falsifique
  // X-Forwarded-For y esquive el rate limiting. Un solo proxy inverso adelante es
  // el escenario real; si algún día hay dos, este número sube.
  app.set('trust proxy', env.TRUST_PROXY ? 1 : false);

  // ---------------------------------------------------------------------------
  // Contexto
  // ---------------------------------------------------------------------------

  // VA PRIMERO, antes incluso que las cabeceras de seguridad. Varios middlewares
  // posteriores pueden rechazar la petición antes de que llegue a una ruta —el
  // parser de JSON, el control de CORS— y si el id se asigna después, esos
  // errores salen sin identificador y no se pueden cruzar con el log.
  app.use(requestContext);

  // ---------------------------------------------------------------------------
  // Seguridad (§38)
  // ---------------------------------------------------------------------------

  // Las cabeceras por defecto alcanzan para una API que devuelve JSON. Si en
  // algún momento este proceso también sirve la SPA, hay que revisar la
  // Content-Security-Policy: la de Helmet bloquea los scripts inline que Vite
  // inyecta en el HTML compilado.
  app.use(helmet());

  app.use(
    cors({
      origin(origin, callback) {
        // Sin cabecera Origin: pedidos del mismo origen, curl, health checks de
        // docker. No hay nada que autorizar.
        if (!origin) {
          callback(null, true);
          return;
        }

        if (env.corsOrigins.includes(origin)) {
          callback(null, true);
          return;
        }

        // Un `ForbiddenError` y no un `Error` pelado: el manejador central
        // clasifica los errores sin tipo como bugs (500 con log de error), y un
        // origen no autorizado no es un bug del servidor sino un 403. El detalle
        // del origen rechazado queda en el log, no en la respuesta.
        callback(
          new ForbiddenError('Origen no permitido.', {
            cause: new Error(`Origen rechazado por CORS: ${origin}`),
          }),
        );
      },
      // Necesario para que el navegador mande y acepte la cookie httpOnly del
      // refresh token. Con credenciales, `origin` no puede ser `*`: por eso la
      // lista explícita de arriba.
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
      exposedHeaders: ['X-Request-Id'],
      maxAge: 24 * 60 * 60,
    }),
  );

  // ---------------------------------------------------------------------------
  // Parsers
  // ---------------------------------------------------------------------------

  app.use(compression());

  // Solo JSON: el frontend manda JSON y el formulario de contacto también. No se
  // habilita `urlencoded` porque es un parser más expuesto y sin uso.
  app.use(express.json({ limit: BODY_LIMIT }));

  // Necesario para leer la cookie httpOnly donde viaja el refresh token.
  app.use(cookieParser());

  // ---------------------------------------------------------------------------
  // Registro de peticiones
  // ---------------------------------------------------------------------------
  // El id ya quedó asignado al principio de la cadena, así que acá solo se
  // engancha el logger.

  app.use(
    pinoHttp({
      logger,
      genReqId: (req) => (req as express.Request).requestId,
      autoLogging: {
        // Los health checks pegan cada pocos segundos y taparían todo lo demás.
        ignore: (req) => req.url === '/api/health',
      },
      customLogLevel: (_req, res, error) => {
        if (error || res.statusCode >= 500) return 'error';
        if (res.statusCode >= 400) return 'warn';
        return 'info';
      },
      customSuccessMessage: (req, res) =>
        `${req.method} ${req.url} -> ${res.statusCode}`,
      customErrorMessage: (req, res) =>
        `${req.method} ${req.url} -> ${res.statusCode}`,
      // Serializadores propios: los de fábrica vuelcan todas las cabeceras,
      // incluida la de autorización y las cookies. Acá no se registra ninguna.
      serializers: {
        req: (req) => ({
          method: req.method,
          url: req.url,
          remoteAddress: req.remoteAddress,
        }),
        res: (res) => ({ statusCode: res.statusCode }),
      },
    }),
  );

  // ---------------------------------------------------------------------------
  // Rutas
  // ---------------------------------------------------------------------------

  app.use('/api', apiRouter);

  // ---------------------------------------------------------------------------
  // Cierre de la cadena
  // ---------------------------------------------------------------------------

  // Cuando la SPA se sirva desde este proceso, su fallback va acá: devolver
  // index.html para las rutas del router de React, excluyendo /api. Tiene que
  // quedar después de las rutas de la API y antes de `notFound`.
  //
  // Ojo con Express 5: `app.get('*', ...)` ya no es válido (path-to-regexp v8
  // rechaza el asterisco suelto). Va como middleware sin path.

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
