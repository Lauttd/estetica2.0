// =============================================================================
// KAYA KALPA — Lógica del módulo de configuración
// =============================================================================

import { settingRepository } from './settings.repository';
import type { PublicSettings, SiteSettingEntry } from './settings.types';

/** Un texto vacío en la base es "sin cargar", no un valor válido. */
function text(raw: string | undefined): string | null {
  const value = raw?.trim();
  return value ? value : null;
}

/**
 * Un interruptor guardado como texto.
 *
 * Ante cualquier cosa que no sea un `'false'` explícito se asume `true`, es
 * decir "falta configurar". El prompt pide no inventar los datos que faltan
 * (§41): si la fila se borró o quedó ilegible, el sitio tiene que avisar que el
 * horario está a confirmar, nunca mostrar uno que nadie cargó.
 */
function flag(raw: string | undefined): boolean {
  return raw?.trim().toLowerCase() !== 'false';
}

export const settingsService = {
  async getPublic(): Promise<PublicSettings> {
    const rows = await settingRepository.findPublic();
    const values = new Map(rows.map((row) => [row.key, row.value]));

    return {
      salon: {
        name: text(values.get('salon_name')),
        tagline: text(values.get('salon_tagline')),
      },
      location: {
        address: text(values.get('address')),
        city: text(values.get('city')),
        province: text(values.get('province')),
        country: text(values.get('country')),
        mapsQuery: text(values.get('maps_query')),
      },
      contact: {
        phoneDisplay: text(values.get('phone_display')),
        whatsappNumber: text(values.get('whatsapp_e164')),
        whatsappMessage: text(values.get('whatsapp_message')),
      },
      social: {
        instagramName: text(values.get('instagram_name')),
        instagramUrl: text(values.get('instagram_url')),
        facebookName: text(values.get('facebook_name')),
        facebookUrl: text(values.get('facebook_url')),
      },
      pending: {
        hours: flag(values.get('hours_are_placeholder')),
        gallery: flag(values.get('gallery_is_placeholder')),
      },
    };
  },

  // ---------------------------------------------------------------------------
  // Panel
  // ---------------------------------------------------------------------------

  async listForAdmin(): Promise<SiteSettingEntry[]> {
    const rows = await settingRepository.findAll();
    return rows.map((row) => ({
      key: row.key,
      value: row.value,
      updatedAt: row.updatedAt.toISOString(),
    }));
  },

  /**
   * Guarda los cambios de la pantalla de configuración.
   *
   * Devuelve la lista completa y no solo lo que se tocó: el panel muestra todas
   * las claves, y responder con un subconjunto lo obligaría a adivinar con qué
   * quedarse para las que no mandó.
   *
   * Los valores llegan ya recortados y validados por clave —el teléfono solo con
   * dígitos, las banderas como 'true' o 'false'— porque un `whatsapp_e164` con
   * espacios arma un enlace de WhatsApp roto, y eso no se descubre hasta que un
   * cliente toca el botón y no pasa nada.
   */
  async updateMany(values: Record<string, string>): Promise<SiteSettingEntry[]> {
    const entries = Object.entries(values).map(([key, value]) => ({ key, value }));

    if (entries.length > 0) {
      await settingRepository.upsertMany(entries);
    }

    return settingsService.listForAdmin();
  },
};
