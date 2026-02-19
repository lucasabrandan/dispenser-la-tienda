package com.dispenserlatienda.dto.servicio;

import java.math.BigDecimal;
import java.time.LocalDate;

public record ServicioItemDTO(
        Long equipoId,
        String numeroSerie,
        String tecnico,
        BigDecimal costo,
        BigDecimal descuento,
        String metodoPago,
        String trabajoRealizado,
        LocalDate garantiaHasta
) {}