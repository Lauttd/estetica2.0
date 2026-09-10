// =============================================================================
// KAYA KALPA — Rutas del panel
// =============================================================================
// ACÁ ESTÁ TODA LA SUPERFICIE PRIVILEGIADA DE LA API. Es el único archivo que hay
// que leer para saber qué se puede hacer con una sesión iniciada, y por eso las
// rutas están todas juntas en vez de repartidas entre los módulos: si cada módulo
// montara las suyas, auditar los permisos sería recorrer el proyecto entero y
// confiar en no haberse olvidado de ninguno.
//
// LOS TRES NIVELES
//
//   · `authGuard` en todo el router. Sin token válido, cualquier ruta de acá
//     responde 401 antes de llegar al controlador.
//   · `requirePasswordChanged` también en todo el router: con la contraseña
//     provisoria del seed, cualquier ruta responde 403 y el panel lleva a
//     cambiarla. Se sale de ese estado desde `/api/auth/change-password`.
//   · `roleGuard(ADMIN)` solo en `/users`. El resto lo puede usar STAFF: quien
//     atiende el salón necesita confirmar turnos, mirar los mensajes y ajustar un
//     precio, pero no decidir quién más entra al sistema.
//
// La validación de cada cuerpo va ANTES del controlador, en el `validate`. Un
// controlador de este proyecto nunca ve un dato sin validar.
// =============================================================================

import { Router } from 'express';
import { AdminRole } from '@prisma/client';
import { asyncHandler } from '../../utils/asyncHandler';
import {
  authGuard,
  requirePasswordChanged,
  roleGuard,
} from '../../middlewares/authGuard';
import { validate } from '../../middlewares/validate';
import { idParamSchema } from '../shared/validation';
import {
  createCategorySchema,
  updateCategorySchema,
} from '../categories/categories.validation';
import {
  createServiceSchema,
  listServicesAdminQuerySchema,
  updateServicePriceSchema,
  updateServiceSchema,
} from '../services/services.validation';
import {
  createProfessionalSchema,
  replaceProfessionalServicesSchema,
  updateProfessionalSchema,
} from '../professionals/professionals.validation';
import {
  createBlockedDateSchema,
  createBlockedTimeSchema,
  createBusinessHourSchema,
  listBlockedDatesQuerySchema,
  listBlockedTimesQuerySchema,
  listBusinessHoursQuerySchema,
  updateBusinessHourSchema,
} from '../schedule/schedule.validation';
import {
  listBookingsAdminQuerySchema,
  updateBookingStatusSchema,
} from '../bookings/bookings.admin.validation';
import { createFaqSchema, updateFaqSchema } from '../faq/faq.validation';
import { updateSettingsSchema } from '../settings/settings.admin.validation';
import {
  listContactMessagesQuerySchema,
  updateContactMessageSchema,
} from '../contact/contact.validation';
import {
  createAdminUserSchema,
  resetAdminPasswordSchema,
  updateAdminUserSchema,
} from '../auth/auth.admin.validation';
import { catalogAdminController } from './catalog.admin.controller';
import { professionalsAdminController } from './professionals.admin.controller';
import { scheduleAdminController } from './schedule.admin.controller';
import { bookingsAdminController } from './bookings.admin.controller';
import { contentAdminController } from './content.admin.controller';
import { messagesAdminController } from './messages.admin.controller';
import { usersAdminController } from './users.admin.controller';

export const adminRouter = Router();

adminRouter.use(authGuard);

// Y después, que haya dejado atrás la contraseña provisoria. El seed crea la
// cuenta con `mustChangePassword: true` y hasta ahora nadie lo hacía cumplir: la
// bandera viajaba en la respuesta del login y quedaba ahí. Va acá y no dentro de
// `authGuard` porque el cambio de contraseña —el único camino para salir de este
// estado— se sirve desde `/api/auth` y quedaría bloqueado por su propia guarda.
adminRouter.use(requirePasswordChanged);

// -----------------------------------------------------------------------------
// Catálogo: categorías y servicios
// -----------------------------------------------------------------------------
// El `id` se valida como UUID en la ruta, antes de tocar la base: un id con
// formato inválido daría un error de Postgres al comparar contra una columna
// `uuid`, y eso sería un 500 por un pedido mal armado.

adminRouter.get('/categories', asyncHandler(catalogAdminController.listCategories));

adminRouter.post(
  '/categories',
  validate({ body: createCategorySchema }),
  asyncHandler(catalogAdminController.createCategory),
);

adminRouter.get(
  '/categories/:id',
  validate({ params: idParamSchema }),
  asyncHandler(catalogAdminController.getCategory),
);

adminRouter.patch(
  '/categories/:id',
  validate({ params: idParamSchema, body: updateCategorySchema }),
  asyncHandler(catalogAdminController.updateCategory),
);

adminRouter.delete(
  '/categories/:id',
  validate({ params: idParamSchema }),
  asyncHandler(catalogAdminController.deactivateCategory),
);

adminRouter.get(
  '/services',
  validate({ query: listServicesAdminQuerySchema }),
  asyncHandler(catalogAdminController.listServices),
);

adminRouter.post(
  '/services',
  validate({ body: createServiceSchema }),
  asyncHandler(catalogAdminController.createService),
);

adminRouter.get(
  '/services/:id',
  validate({ params: idParamSchema }),
  asyncHandler(catalogAdminController.getService),
);

// Va antes del `PATCH /:id` por claridad, aunque las dos rutas son distinguibles
// por el segmento extra y el orden no cambiaría el resultado.
adminRouter.patch(
  '/services/:id/price',
  validate({ params: idParamSchema, body: updateServicePriceSchema }),
  asyncHandler(catalogAdminController.updateServicePrice),
);

adminRouter.patch(
  '/services/:id',
  validate({ params: idParamSchema, body: updateServiceSchema }),
  asyncHandler(catalogAdminController.updateService),
);

adminRouter.delete(
  '/services/:id',
  validate({ params: idParamSchema }),
  asyncHandler(catalogAdminController.deactivateService),
);

// -----------------------------------------------------------------------------
// Profesionales
// -----------------------------------------------------------------------------

adminRouter.get('/professionals', asyncHandler(professionalsAdminController.list));

adminRouter.post(
  '/professionals',
  validate({ body: createProfessionalSchema }),
  asyncHandler(professionalsAdminController.create),
);

adminRouter.get(
  '/professionals/:id',
  validate({ params: idParamSchema }),
  asyncHandler(professionalsAdminController.get),
);

// `PUT` y no `PATCH`: manda el conjunto completo de servicios que hace, no una
// suma. Con un `PATCH` que agregara, destildar un servicio no tendría forma de
// expresarse.
adminRouter.put(
  '/professionals/:id/services',
  validate({ params: idParamSchema, body: replaceProfessionalServicesSchema }),
  asyncHandler(professionalsAdminController.replaceServices),
);

adminRouter.patch(
  '/professionals/:id',
  validate({ params: idParamSchema, body: updateProfessionalSchema }),
  asyncHandler(professionalsAdminController.update),
);

adminRouter.delete(
  '/professionals/:id',
  validate({ params: idParamSchema }),
  asyncHandler(professionalsAdminController.deactivate),
);

// -----------------------------------------------------------------------------
// Agenda: franjas de atención, días bloqueados y franjas bloqueadas
// -----------------------------------------------------------------------------

adminRouter.get(
  '/business-hours',
  validate({ query: listBusinessHoursQuerySchema }),
  asyncHandler(scheduleAdminController.listBusinessHours),
);

adminRouter.post(
  '/business-hours',
  validate({ body: createBusinessHourSchema }),
  asyncHandler(scheduleAdminController.createBusinessHour),
);

adminRouter.get(
  '/business-hours/:id',
  validate({ params: idParamSchema }),
  asyncHandler(scheduleAdminController.getBusinessHour),
);

adminRouter.patch(
  '/business-hours/:id',
  validate({ params: idParamSchema, body: updateBusinessHourSchema }),
  asyncHandler(scheduleAdminController.updateBusinessHour),
);

adminRouter.delete(
  '/business-hours/:id',
  validate({ params: idParamSchema }),
  asyncHandler(scheduleAdminController.deleteBusinessHour),
);

adminRouter.get(
  '/blocked-dates',
  validate({ query: listBlockedDatesQuerySchema }),
  asyncHandler(scheduleAdminController.listBlockedDates),
);

adminRouter.post(
  '/blocked-dates',
  validate({ body: createBlockedDateSchema }),
  asyncHandler(scheduleAdminController.createBlockedDate),
);

adminRouter.delete(
  '/blocked-dates/:id',
  validate({ params: idParamSchema }),
  asyncHandler(scheduleAdminController.deleteBlockedDate),
);

adminRouter.get(
  '/blocked-times',
  validate({ query: listBlockedTimesQuerySchema }),
  asyncHandler(scheduleAdminController.listBlockedTimes),
);

adminRouter.post(
  '/blocked-times',
  validate({ body: createBlockedTimeSchema }),
  asyncHandler(scheduleAdminController.createBlockedTime),
);

adminRouter.delete(
  '/blocked-times/:id',
  validate({ params: idParamSchema }),
  asyncHandler(scheduleAdminController.deleteBlockedTime),
);

// -----------------------------------------------------------------------------
// Turnos
// -----------------------------------------------------------------------------

adminRouter.get(
  '/bookings',
  validate({ query: listBookingsAdminQuerySchema }),
  asyncHandler(bookingsAdminController.list),
);

adminRouter.get(
  '/bookings/:id',
  validate({ params: idParamSchema }),
  asyncHandler(bookingsAdminController.get),
);

adminRouter.patch(
  '/bookings/:id/status',
  validate({ params: idParamSchema, body: updateBookingStatusSchema }),
  asyncHandler(bookingsAdminController.updateStatus),
);

// -----------------------------------------------------------------------------
// Contenido del sitio
// -----------------------------------------------------------------------------

adminRouter.get('/faq', asyncHandler(contentAdminController.listFaq));

adminRouter.post(
  '/faq',
  validate({ body: createFaqSchema }),
  asyncHandler(contentAdminController.createFaq),
);

adminRouter.patch(
  '/faq/:id',
  validate({ params: idParamSchema, body: updateFaqSchema }),
  asyncHandler(contentAdminController.updateFaq),
);

adminRouter.delete(
  '/faq/:id',
  validate({ params: idParamSchema }),
  asyncHandler(contentAdminController.deactivateFaq),
);

adminRouter.get('/settings', asyncHandler(contentAdminController.listSettings));

adminRouter.patch(
  '/settings',
  validate({ body: updateSettingsSchema }),
  asyncHandler(contentAdminController.updateSettings),
);

// -----------------------------------------------------------------------------
// Mensajes del formulario de contacto
// -----------------------------------------------------------------------------

adminRouter.get(
  '/contact-messages',
  validate({ query: listContactMessagesQuerySchema }),
  asyncHandler(messagesAdminController.list),
);

adminRouter.get(
  '/contact-messages/unread-count',
  asyncHandler(messagesAdminController.unreadCount),
);

adminRouter.patch(
  '/contact-messages/:id',
  validate({ params: idParamSchema, body: updateContactMessageSchema }),
  asyncHandler(messagesAdminController.updateStatus),
);

// -----------------------------------------------------------------------------
// Usuarios — SOLO ADMIN
// -----------------------------------------------------------------------------
// Es el único grupo con `roleGuard`. Un STAFF que llegue acá recibe 403, no 401:
// tiene sesión válida, lo que no tiene es permiso.

adminRouter.get(
  '/users',
  roleGuard(AdminRole.ADMIN),
  asyncHandler(usersAdminController.list),
);

adminRouter.post(
  '/users',
  roleGuard(AdminRole.ADMIN),
  validate({ body: createAdminUserSchema }),
  asyncHandler(usersAdminController.create),
);

adminRouter.patch(
  '/users/:id',
  roleGuard(AdminRole.ADMIN),
  validate({ params: idParamSchema, body: updateAdminUserSchema }),
  asyncHandler(usersAdminController.update),
);

// `POST` y no `PATCH /users/:id/password`: restablecer una contraseña no es una
// edición del usuario —cierra todas sus sesiones— y mezclarla con el cambio de
// rol haría que guardar la pantalla echara a alguien sin que nadie lo pidiera.
adminRouter.post(
  '/users/:id/password',
  roleGuard(AdminRole.ADMIN),
  validate({ params: idParamSchema, body: resetAdminPasswordSchema }),
  asyncHandler(usersAdminController.resetPassword),
);
