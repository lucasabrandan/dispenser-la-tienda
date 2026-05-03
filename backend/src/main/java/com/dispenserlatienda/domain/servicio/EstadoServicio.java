package com.dispenserlatienda.domain.servicio;

// Enum que define todos los estados posibles de un Servicio
// Reemplaza al String "estado" que estaba en la entidad Servicio
// Uso: servicio.setEstado(EstadoServicio.PRESUPUESTO);
public enum EstadoServicio {
    // Cliente aún no aprobó el presupuesto
    PRESUPUESTO,

    // Cliente aprobó el presupuesto
    APROBADO,

    // El técnico está trabajando en el servicio
    EN_PROGRESO,

    // Servicio completado y pagado
    REALIZADO,

    // Cliente rechazó el presupuesto
    RECHAZADO,

    // Servicio cancelado por ambas partes
    CANCELADO,

    // Archivado manualmente — no se elimina, queda auditable
    ARCHIVADO
}