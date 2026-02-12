package com.dispenserlatienda.service.servicio;

import com.dispenserlatienda.domain.servicio.TrabajoTipo;

import java.time.LocalDate;

public class GarantiaCalculator {

    private GarantiaCalculator() {}

    public static LocalDate calcular(LocalDate fechaServicio, TrabajoTipo trabajoTipo) {
        // Regla inicial simple (la refinamos después)
        return switch (trabajoTipo) {
            case CAMBIO_FILTRO -> fechaServicio.plusDays(365);
            case LIMPIEZA -> fechaServicio.plusDays(90);
            case REPARACION -> fechaServicio.plusDays(90);
            case REVISION -> null; // sin garantía
        };
    }
}
