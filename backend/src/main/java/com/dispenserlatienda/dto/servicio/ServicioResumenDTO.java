package com.dispenserlatienda.dto.servicio;

// Resumen de stats para el panel de gestión (accessible a TECNICO y ADMIN)
public record ServicioResumenDTO(
        double totalMes,
        long   cantidadMes,
        double totalHoy,
        long   cantidadHoy,
        double gananciaTotal,
        long   pendientesCount,
        double pendientesVal
) {}
