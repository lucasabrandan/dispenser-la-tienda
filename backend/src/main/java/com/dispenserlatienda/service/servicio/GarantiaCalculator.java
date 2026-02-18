package com.dispenserlatienda.service.servicio;

import com.dispenserlatienda.domain.servicio.TrabajoTipo;

import java.time.LocalDate;
import java.util.Objects;

public class GarantiaCalculator {

    private GarantiaCalculator() {}

    public static LocalDate calcular(LocalDate fechaServicio, TrabajoTipo trabajoTipo) {
        Objects.requireNonNull(fechaServicio, "fechaServicio es obligatoria");
        Objects.requireNonNull(trabajoTipo, "trabajoTipo es obligatorio");

        // Regla inicial simple y defendible:
        // - CAMBIO_FILTRO: 12 meses
        // - LIMPIEZA/REPARACION: 3 meses
        // - REVISION: sin garantía
        return switch (trabajoTipo) {
            case CAMBIO_FILTRO -> fechaServicio.plusMonths(12);
            case LIMPIEZA, REPARACION -> fechaServicio.plusMonths(3);
            case REVISION -> null;
        };
    }
}
