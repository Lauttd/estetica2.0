-- =============================================================================
-- KAYA KALPA — Verificación de la integridad de turnos
-- =============================================================================
-- Comprueba que el constraint `bookings_no_overlap` realmente impide el doble
-- turno, escribiendo DIRECTO contra Postgres (sin pasar por la API ni por
-- Prisma). Es la única forma de saber que la protección no depende del código
-- de aplicación: si alguien agrega un endpoint nuevo, corre un script suelto o
-- se conecta por psql, el motor sigue rechazando el solapamiento.
--
-- Correr con (bash / Git Bash):
--   docker exec -i kaya-kalpa-db psql -U kaya -d kaya_kalpa -q \
--     < server/checks/booking-integrity.sql
--
-- En PowerShell no existe el redirector `<`, así que va por caño:
--   Get-Content server/checks/booking-integrity.sql -Raw |
--     docker exec -i kaya-kalpa-db psql -U kaya -d kaya_kalpa -q
--
-- Todo ocurre dentro de una transacción que termina en ROLLBACK: no deja
-- ningún dato en la base, ni siquiera la función auxiliar (es de pg_temp).
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- Auxiliar: intenta insertar un turno y devuelve 'ok' o 'overlap'.
-- El bloque EXCEPTION crea un savepoint, así que un insert rechazado no aborta
-- la transacción y se pueden seguir probando escenarios.
-- -----------------------------------------------------------------------------
CREATE FUNCTION pg_temp.try_booking(
  p_code         text,
  p_customer     uuid,
  p_professional uuid,
  p_day          date,
  p_start        time,
  p_end          time,
  p_occupied     time,
  p_status       "BookingStatus"
) RETURNS text
LANGUAGE plpgsql AS $fn$
BEGIN
  INSERT INTO bookings (
    id, code, "customerId", "professionalId", date,
    "startAt", "endAt", "occupiedUntil", status,
    "totalDurationMin", "totalPriceCents", "cancelToken", "createdAt", "updatedAt"
  ) VALUES (
    gen_random_uuid(), p_code, p_customer, p_professional, p_day,
    (p_day + p_start)    AT TIME ZONE 'America/Argentina/Cordoba',
    (p_day + p_end)      AT TIME ZONE 'America/Argentina/Cordoba',
    (p_day + p_occupied) AT TIME ZONE 'America/Argentina/Cordoba',
    p_status,
    (EXTRACT(EPOCH FROM (p_end - p_start)) / 60)::int,  -- duración del servicio
    2800000,                                            -- $28.000 en centavos
    gen_random_uuid()::text,
    now(), now()
  );
  RETURN 'ok';
EXCEPTION WHEN exclusion_violation THEN
  RETURN 'overlap';
END;
$fn$;

-- -----------------------------------------------------------------------------
-- Escenarios
-- -----------------------------------------------------------------------------
DO $check$
DECLARE
  v_prof_a uuid;
  v_prof_b uuid;
  v_cust   uuid;
  v_day    date := DATE '2099-09-15';  -- futuro: no choca con datos reales
  v_r      text;
  v_pass   int := 0;
  v_fail   int := 0;
BEGIN
  SELECT id INTO v_prof_a FROM professionals ORDER BY "sortOrder" LIMIT 1;
  SELECT id INTO v_prof_b FROM professionals ORDER BY "sortOrder" OFFSET 1 LIMIT 1;

  INSERT INTO customers (id, "firstName", "lastName", phone, "createdAt", "updatedAt")
  VALUES (gen_random_uuid(), 'Prueba', 'Integridad', '5490000000001', now(), now())
  RETURNING id INTO v_cust;

  -- 1. Turno base 16:00–17:00, ocupado hasta 17:10 por el buffer de limpieza.
  v_r := pg_temp.try_booking('CHK-A', v_cust, v_prof_a, v_day,
                             '16:00', '17:00', '17:10', 'CONFIRMED');
  IF v_r = 'ok' THEN
    RAISE NOTICE '  ✓  Turno base 16:00–17:00 insertado';
    v_pass := v_pass + 1;
  ELSE
    RAISE NOTICE '  ✗  El turno base fue rechazado — el constraint está mal definido';
    v_fail := v_fail + 1;
  END IF;

  -- 2. Solapamiento parcial 16:30–17:30 -> debe rebotar.
  v_r := pg_temp.try_booking('CHK-B', v_cust, v_prof_a, v_day,
                             '16:30', '17:30', '17:40', 'CONFIRMED');
  IF v_r = 'overlap' THEN
    RAISE NOTICE '  ✓  Solapamiento 16:30–17:30 rechazado';
    v_pass := v_pass + 1;
  ELSE
    RAISE NOTICE '  ✗  Solapamiento aceptado — DOBLE TURNO POSIBLE';
    v_fail := v_fail + 1;
  END IF;

  -- 3. Arranca 17:00, cuando el servicio anterior terminó pero el buffer sigue
  --    corriendo hasta 17:10 -> debe rebotar.
  v_r := pg_temp.try_booking('CHK-C', v_cust, v_prof_a, v_day,
                             '17:00', '18:00', '18:10', 'CONFIRMED');
  IF v_r = 'overlap' THEN
    RAISE NOTICE '  ✓  Turno dentro del buffer de limpieza rechazado';
    v_pass := v_pass + 1;
  ELSE
    RAISE NOTICE '  ✗  Turno dentro del buffer aceptado — el buffer no se respeta';
    v_fail := v_fail + 1;
  END IF;

  -- 4. Arranca 17:10, exactamente cuando termina el buffer -> debe entrar.
  --    El rango es semiabierto [inicio, fin): 17:10 no se superpone con
  --    [16:00, 17:10). Sin esto se perderían turnos consecutivos.
  v_r := pg_temp.try_booking('CHK-D', v_cust, v_prof_a, v_day,
                             '17:10', '18:10', '18:20', 'CONFIRMED');
  IF v_r = 'ok' THEN
    RAISE NOTICE '  ✓  Turno contiguo 17:10 aceptado (rango semiabierto)';
    v_pass := v_pass + 1;
  ELSE
    RAISE NOTICE '  ✗  Turno contiguo rechazado — se pierden horarios válidos';
    v_fail := v_fail + 1;
  END IF;

  -- 5. Otro profesional, mismo horario -> debe entrar.
  v_r := pg_temp.try_booking('CHK-E', v_cust, v_prof_b, v_day,
                             '16:00', '17:00', '17:10', 'CONFIRMED');
  IF v_r = 'ok' THEN
    RAISE NOTICE '  ✓  Otro profesional en el mismo horario aceptado';
    v_pass := v_pass + 1;
  ELSE
    RAISE NOTICE '  ✗  Otro profesional bloqueado — el índice no discrimina profesional';
    v_fail := v_fail + 1;
  END IF;

  -- 6. Cancelar libera el horario: el índice es parcial (solo PENDING/CONFIRMED).
  --    Se reintenta EXACTAMENTE el mismo horario que ocupaba CHK-A.
  UPDATE bookings SET status = 'CANCELLED' WHERE code = 'CHK-A' AND date = v_day;
  v_r := pg_temp.try_booking('CHK-F', v_cust, v_prof_a, v_day,
                             '16:00', '17:00', '17:10', 'PENDING');
  IF v_r = 'ok' THEN
    RAISE NOTICE '  ✓  Cancelar liberó el horario';
    v_pass := v_pass + 1;
  ELSE
    RAISE NOTICE '  ✗  El turno cancelado sigue bloqueando la agenda';
    v_fail := v_fail + 1;
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '  Resultado: % correctas, % fallidas', v_pass, v_fail;
  RAISE NOTICE '';

  IF v_fail > 0 THEN
    RAISE EXCEPTION 'La integridad de turnos NO está garantizada (% fallas)', v_fail;
  END IF;
END;
$check$;

-- No dejar rastro: se descartan las filas de prueba y la función pg_temp.
ROLLBACK;
