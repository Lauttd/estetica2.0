-- =============================================================================
-- KAYA KALPA — Garantía estructural contra el doble turno
-- =============================================================================
-- MIGRACIÓN ESCRITA A MANO. No la genera Prisma y no la va a regenerar:
-- `prisma migrate dev` compara el *schema* contra la base sombra construida a
-- partir del historial de migraciones, y los objetos que viven solo dentro de un
-- archivo de migración le son invisibles. Por eso no los va a borrar.
--
-- ⚠  NUNCA correr `prisma db push`: compara contra la base viva, no conoce estos
--    objetos, y los eliminaría dejando el sistema sin protección contra el
--    doble turno. El flujo correcto es siempre:
--        migrate dev --create-only  ->  revisar/editar  ->  migrate dev
--    y en producción `migrate deploy`.
--    `migrate reset` es seguro: reaplica los archivos y los recrea.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 0. btree_gist
-- -----------------------------------------------------------------------------
-- Habilita el operador de igualdad (=) dentro de un índice GiST, que es lo que
-- permite combinar "mismo profesional" con "rango solapado" en un solo índice.
CREATE EXTENSION IF NOT EXISTS btree_gist;


-- -----------------------------------------------------------------------------
-- 1. Un profesional no puede tener dos turnos activos superpuestos
-- -----------------------------------------------------------------------------
-- Esta es la única garantía real contra el doble turno. La capa de aplicación
-- además toma un advisory lock por (profesional, día) para dar un error limpio,
-- pero si esa capa falla, se saltea o alguien escribe directo por psql, este
-- constraint sigue rechazando el solapamiento.
--
-- Detalles de por qué está escrito así:
--
--   · Se indexa sobre `occupiedUntil`, no sobre `endAt`, para que el buffer de
--     limpieza entre turnos también quede protegido.
--
--   · El rango es '[)' (incluye el inicio, excluye el fin): un turno que termina
--     13:00 y otro que empieza 13:00 NO se consideran superpuestos. Con '[]' se
--     rechazarían los turnos consecutivos, que son la norma.
--
--   · Es un índice PARCIAL limitado a PENDING y CONFIRMED. Los turnos cancelados
--     quedan fuera, y por eso cancelar libera el horario inmediatamente.
--     COMPLETED y NO_SHOW también quedan fuera: ya son pasado y no compiten por
--     la agenda futura.
ALTER TABLE "bookings"
  ADD CONSTRAINT "bookings_no_overlap"
  EXCLUDE USING gist (
    "professionalId" WITH =,
    tstzrange("startAt", "occupiedUntil", '[)') WITH &&
  )
  WHERE ("status" = ANY (ARRAY['PENDING','CONFIRMED']::"BookingStatus"[]));


-- -----------------------------------------------------------------------------
-- 2. Un solo bloqueo global por fecha
-- -----------------------------------------------------------------------------
-- En Postgres los NULL se consideran distintos entre sí en un índice único, así
-- que el @@unique([professionalId, date]) del schema NO impide cargar dos
-- bloqueos globales (professionalId = NULL) para la misma fecha. Este índice
-- parcial sí, porque excluye la columna que es NULL.
CREATE UNIQUE INDEX "blocked_dates_global_unique"
  ON "blocked_dates" ("date")
  WHERE "professionalId" IS NULL;


-- -----------------------------------------------------------------------------
-- 3. Índice de apoyo para el motor de disponibilidad
-- -----------------------------------------------------------------------------
-- La consulta caliente del motor: "turnos activos de tal profesional en tal
-- día". Parcial, para que el índice no cargue con el histórico de turnos ya
-- completados, que crece todos los días y nunca se consulta para disponibilidad.
CREATE INDEX "bookings_active_professional_range_idx"
  ON "bookings" ("professionalId", "date", "startAt", "occupiedUntil")
  WHERE "status" = ANY (ARRAY['PENDING','CONFIRMED']::"BookingStatus"[]);
