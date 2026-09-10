// =============================================================================
// KAYA KALPA — Generación de slugs
// =============================================================================
// El slug es la parte legible de la URL (/servicios/peeling-enzimatico) y por eso
// importa para el posicionamiento (§37): "maderoterapia-formosa" se lee y se
// posiciona, un UUID no.
//
// Se genera SIEMPRE en el servidor a partir del nombre. Si lo mandara el cliente
// habría que validarlo, y el mismo servicio podría terminar con dos direcciones
// distintas según quién lo cargue.
// =============================================================================

/** Largo máximo de un slug. Es el mismo tope que valida `slugParamSchema`. */
export const MAX_SLUG_LENGTH = 120;

/**
 * Convierte un nombre en slug.
 *
 * `normalize('NFD')` separa cada letra de su acento y el reemplazo borra los
 * acentos sueltos: así "Peeling Enzimático" da "peeling-enzimatico" y no
 * "peeling-enzim-tico". Sin ese paso, la "ó" cae en el reemplazo de "todo lo que
 * no sea letra o número" y el slug queda cortado al medio.
 */
export function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_SLUG_LENGTH)
    // El recorte por largo puede dejar un guion colgado al final.
    .replace(/-+$/g, '');
}

/**
 * Un slug libre a partir del deseado.
 *
 * Si "manicura" ya existe, prueba "manicura-2", "manicura-3"… en vez de rechazar
 * el alta. No es una comodidad: pasa de verdad que dos servicios se llamen igual
 * —"Semipermanente" existe en manos y en pies— y quien carga el catálogo no
 * tiene por qué saber que el nombre corto es la dirección pública.
 *
 * `isTaken` recibe el candidato y dice si ya está usado, para que cada módulo
 * consulte su propia tabla sin que esto dependa de Prisma.
 */
export async function availableSlug(
  desired: string,
  isTaken: (candidate: string) => Promise<boolean>,
  attempts = 50,
): Promise<string> {
  // Un nombre que era solo símbolos ("!!!") deja el slug vacío y la URL quedaría
  // en /servicios/. Se usa un valor de relleno antes que generar una ruta rota.
  const base = slugify(desired) || 'servicio';

  if (!(await isTaken(base))) return base;

  for (let suffix = 2; suffix <= attempts; suffix += 1) {
    // Se recorta el sufijo ANTES de agregarlo: si no, un nombre que ya llegó al
    // máximo de largo se pasaría al sumarle "-12".
    const room = MAX_SLUG_LENGTH - String(suffix).length - 1;
    const candidate = `${base.slice(0, room)}-${suffix}`;
    if (!(await isTaken(candidate))) return candidate;
  }

  // Con 50 intentos, llegar acá significa que la tabla tiene decenas de servicios
  // homónimos. Es preferible un error a devolver un slug repetido y romper el
  // índice único.
  throw new Error(`No se pudo generar un slug libre a partir de "${desired}".`);
}
