// =============================================================================
// KAYA KALPA — Rutas de la API
// =============================================================================
// Un solo lugar donde se ve todo lo que expone la API. Cada módulo arma su
// propio router y acá se monta bajo /api.
// =============================================================================

import { Router } from 'express';
import { apiLimiter } from '../middlewares/rateLimit';
import { healthRouter } from './health.routes';
import { authRouter } from '../modules/auth/auth.routes';
import { adminRouter } from '../modules/admin/admin.routes';
import { categoriesRouter } from '../modules/categories/categories.routes';
import { servicesRouter } from '../modules/services/services.routes';
import { professionalsRouter } from '../modules/professionals/professionals.routes';
import { availabilityRouter } from '../modules/availability/availability.routes';
import { bookingsRouter } from '../modules/bookings/bookings.routes';
import { faqRouter } from '../modules/faq/faq.routes';
import { settingsRouter } from '../modules/settings/settings.routes';
import { contactRouter } from '../modules/contact/contact.routes';
import { galleryRouter } from '../modules/gallery/gallery.routes';
import { scheduleRouter } from '../modules/schedule/schedule.routes';

export const apiRouter = Router();

// El estado del servicio va ANTES del limitador: el hosting lo consulta cada
// pocos segundos y, si consumiera cupo, el propio monitoreo terminaría
// disparando el límite contra los visitantes reales.
apiRouter.use('/health', healthRouter);

// Todo lo demás pasa por el techo general de uso.
apiRouter.use(apiLimiter);

// -----------------------------------------------------------------------------
// Autenticación
// -----------------------------------------------------------------------------
// Va antes de las rutas públicas porque es la puerta del panel. Sus propias rutas
// deciden cuáles quedan abiertas —ingresar, refrescar, salir— y cuáles exigen
// estar adentro.

apiRouter.use('/auth', authRouter);

// -----------------------------------------------------------------------------
// Rutas públicas
// -----------------------------------------------------------------------------
// Solo lectura: el catálogo, quién atiende, qué horarios hay y los datos
// institucionales. Ninguna de estas toca datos personales ni permite modificar
// nada, así que no llevan autenticación.

apiRouter.use('/categories', categoriesRouter);
apiRouter.use('/services', servicesRouter);
apiRouter.use('/professionals', professionalsRouter);
apiRouter.use('/availability', availabilityRouter);
apiRouter.use('/faq', faqRouter);
apiRouter.use('/settings', settingsRouter);
apiRouter.use('/gallery', galleryRouter);
apiRouter.use('/schedule', scheduleRouter);

// -----------------------------------------------------------------------------
// Turnos
// -----------------------------------------------------------------------------
// Público y de escritura, que es la única excepción a la regla de arriba: sacar
// un turno no requiere cuenta. Como es el único endpoint público que crea filas,
// es también el que más expuesto está a un uso automatizado, y por eso sus rutas
// de escritura llevan un límite más ajustado que el general.

apiRouter.use('/bookings', bookingsRouter);

// El formulario de contacto también escribe sin cuenta. Comparte el limitador
// ajustado con los turnos por el mismo motivo: es una puerta abierta a que
// alguien llene la bandeja del panel.
apiRouter.use('/contact', contactRouter);

// -----------------------------------------------------------------------------
// Panel
// -----------------------------------------------------------------------------
// Todo lo que hay debajo exige sesión. El `authGuard` y el `roleGuard` están
// montados dentro de `adminRouter`, no acá: así la protección viaja con las rutas
// y no depende de que este archivo se acuerde de aplicarla.

apiRouter.use('/admin', adminRouter);
