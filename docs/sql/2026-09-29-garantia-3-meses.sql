-- ============================================================================
-- Garantía a 3 meses — 29-sep-2026
-- Recalcula a 3 meses desde la fecha del servicio las garantías guardadas con 6.
-- Correr en pgAdmin, DE A UN BLOQUE, empezando por la vista previa.
-- ============================================================================

-- 0) Chequeo: confirma que la columna existe con este nombre.
--    Si no devuelve ninguna fila, avisale a Claude antes de seguir.
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'servicio_items' AND column_name = 'garantia_hasta';

-- 1) VISTA PREVIA: ítems cuya garantía supera los 3 meses desde el servicio.
SELECT s.id              AS servicio,
       s.cliente_nombre,
       s.fecha_servicio,
       si.garantia_hasta AS garantia_actual,
       (s.fecha_servicio + INTERVAL '3 months')::date AS garantia_nueva
FROM servicio_items si
JOIN servicio s ON s.id = si.servicio_id
WHERE si.garantia_hasta IS NOT NULL
  AND s.fecha_servicio IS NOT NULL
  AND si.garantia_hasta > (s.fecha_servicio + INTERVAL '3 months')::date
ORDER BY s.fecha_servicio DESC;

-- 2) CORRECCIÓN (solo si la vista previa tiene sentido)
BEGIN;
UPDATE servicio_items si
SET garantia_hasta = (s.fecha_servicio + INTERVAL '3 months')::date
FROM servicio s
WHERE s.id = si.servicio_id
  AND si.garantia_hasta IS NOT NULL
  AND s.fecha_servicio IS NOT NULL
  AND si.garantia_hasta > (s.fecha_servicio + INTERVAL '3 months')::date;
-- Revisá el "UPDATE n": tiene que coincidir con las filas de la vista previa.
COMMIT;
