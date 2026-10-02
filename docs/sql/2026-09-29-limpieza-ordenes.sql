-- ============================================================================
-- Limpieza única — 29-sep-2026
-- Correr en pgAdmin / psql contra la base de producción, DE A UN BLOQUE.
-- Primero el SELECT de vista previa; si los números tienen sentido, los UPDATE.
-- ============================================================================

-- 1) VISTA PREVIA: órdenes "activas" cuyo presupuesto ya se cerró, se archivó
--    o ya no existe (son las que inflaban el contador de Técnico y el Panel).
SELECT COALESCE(s.estado, '(servicio borrado)') AS estado_servicio, COUNT(*) AS ordenes
FROM orden_visita o
LEFT JOIN servicio s ON s.id = o.presupuesto_id
WHERE o.estado IN ('PENDIENTE', 'EN_CAMINO', 'EN_SITIO')
  AND o.presupuesto_id IS NOT NULL
GROUP BY 1
ORDER BY 2 DESC;

-- 2) Trabajo ya hecho/cobrado → la orden pasa a COMPLETADA
BEGIN;
UPDATE orden_visita o
SET estado = 'COMPLETADA', fecha_completada = now()
FROM servicio s
WHERE s.id = o.presupuesto_id
  AND o.estado IN ('PENDIENTE', 'EN_CAMINO', 'EN_SITIO')
  AND s.estado IN ('COMPLETADO', 'PENDIENTE_FACTURACION', 'FACTURADO', 'COBRADO', 'REALIZADO');

-- 3) Presupuesto archivado/cancelado, o borrado → la orden pasa a CANCELADA
UPDATE orden_visita o
SET estado = 'CANCELADA'
WHERE o.estado IN ('PENDIENTE', 'EN_CAMINO', 'EN_SITIO')
  AND o.presupuesto_id IS NOT NULL
  AND (
        NOT EXISTS (SELECT 1 FROM servicio s WHERE s.id = o.presupuesto_id)
     OR EXISTS (SELECT 1 FROM servicio s WHERE s.id = o.presupuesto_id AND s.estado IN ('ARCHIVADO', 'CANCELADO'))
  );
COMMIT;

-- 4) Notificaciones: la base tiene una lista vieja de tipos permitidos y rechaza
--    TRABAJO_ASIGNADO (error en el log desde el 1-sep). Se rehace con la lista actual.
ALTER TABLE notificacion DROP CONSTRAINT IF EXISTS notificacion_tipo_check;
ALTER TABLE notificacion ADD CONSTRAINT notificacion_tipo_check CHECK (tipo IN (
  'ORDEN_ASIGNADA', 'ORDEN_COMPLETADA', 'ORDEN_NO_ATENDIDO', 'ORDEN_EN_CAMINO',
  'ORDEN_EN_SITIO', 'PRESUPUESTO_EJECUTADO', 'COBRO_REGISTRADO', 'MENSAJE_LIBRE',
  'TRABAJO_ASIGNADO'
));
