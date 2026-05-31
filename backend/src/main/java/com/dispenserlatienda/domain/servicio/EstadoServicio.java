package com.dispenserlatienda.domain.servicio;

public enum EstadoServicio {
    PRESUPUESTO,
    APROBADO,
    EN_PROGRESO,
    // Técnico terminó el trabajo, falta definir cobro
    COMPLETADO,
    // Admin debe emitir factura (+30% impuestos)
    PENDIENTE_FACTURACION,
    // Factura emitida, esperando transferencia del cliente
    FACTURADO,
    // Pagado (efectivo o transferencia) — estado final
    COBRADO,
    // Legacy: mantener compatibilidad con datos existentes
    REALIZADO,
    CANCELADO,
    ARCHIVADO
}