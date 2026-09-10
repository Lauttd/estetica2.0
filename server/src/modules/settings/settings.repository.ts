// =============================================================================
// KAYA KALPA — Acceso a datos de la configuración del sitio
// =============================================================================

import { prisma } from '../../config/prisma';

/**
 * Las claves que la API pública puede devolver.
 *
 * Es una lista blanca: lo que no está acá no sale, aunque esté cargado en la
 * tabla. Así, cuando el panel sume configuraciones internas (por ejemplo, el
 * tiempo que un turno queda pendiente antes de liberarse), no hay que acordarse
 * de esconderlas: quedan afuera solas.
 *
 * `booking_pending_ttl_minutes` es justamente uno de esos casos: es una regla de
 * funcionamiento del sistema y el frontend no la necesita.
 *
 * OJO: esa clave está cargada en el seed y es editable desde el panel, pero
 * **todavía no la lee nadie**. Un turno PENDING retiene su horario hasta que
 * alguien lo confirme o lo cancele, sin vencimiento automático. Está anotado como
 * pendiente en CONFLICTOS.md para no dejarlo pasar como si funcionara.
 */
export const PUBLIC_SETTING_KEYS = [
  'salon_name',
  'salon_tagline',
  'address',
  'city',
  'province',
  'country',
  'maps_query',
  'phone_display',
  'whatsapp_e164',
  'whatsapp_message',
  'instagram_name',
  'instagram_url',
  'facebook_name',
  'facebook_url',
  'hours_are_placeholder',
  'gallery_is_placeholder',
] as const;

/**
 * Las claves que el panel puede editar.
 *
 * Es la lista pública más las internas: el panel tiene que poder tocar también
 * lo que el sitio no muestra, porque son parámetros de funcionamiento y no hay
 * otra pantalla donde hacerlo.
 *
 * Se escribe acá y no en la validación para que el repositorio y el servicio
 * usen la misma: si la validación aceptara una clave que el repositorio no
 * conoce, el `upsert` la crearía y quedaría una fila que nadie lee.
 */
export const INTERNAL_SETTING_KEYS = ['booking_pending_ttl_minutes'] as const;

export const EDITABLE_SETTING_KEYS = [
  ...PUBLIC_SETTING_KEYS,
  ...INTERNAL_SETTING_KEYS,
] as const;

export const settingRepository = {
  /**
   * Las filas de la lista blanca que existan.
   *
   * La consulta ya viene acotada por `key IN (...)`: no se traen las demás, así
   * que una clave nueva no puede terminar publicada por descuido.
   */
  async findPublic(): Promise<Array<{ key: string; value: string }>> {
    return prisma.siteSetting.findMany({
      where: { key: { in: [...PUBLIC_SETTING_KEYS] } },
      select: { key: true, value: true },
    });
  },

  /**
   * Todas las filas, para la pantalla de configuración.
   *
   * Acá sí van las internas: es la única lectura que las incluye, y va detrás del
   * guarda de administración.
   */
  async findAll() {
    return prisma.siteSetting.findMany({
      orderBy: { key: 'asc' },
      select: { key: true, value: true, updatedAt: true },
    });
  },

  /**
   * Escribe varias claves de una vez.
   *
   * En una transacción porque la pantalla de configuración se guarda entera: si
   * se guardaran de a una y algo fallara a mitad, quedaría la configuración
   * mitad vieja y mitad nueva, que es peor que no haber guardado nada.
   *
   * No crea claves nuevas —las que llegan ya están validadas contra la lista de
   * arriba— pero usa `upsert` igual para que restaurar una fila borrada a mano
   * desde la base no falle.
   */
  async upsertMany(entries: Array<{ key: string; value: string }>): Promise<void> {
    await prisma.$transaction(
      entries.map((entry) =>
        prisma.siteSetting.upsert({
          where: { key: entry.key },
          update: { value: entry.value },
          create: { key: entry.key, value: entry.value },
        }),
      ),
    );
  },
};
