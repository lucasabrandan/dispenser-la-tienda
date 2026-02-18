package com.dispenserlatienda.dto.servicio;

import java.math.BigDecimal;
import java.time.LocalDate;

public record ServicioItemDTO(
        Long equipoId,
        String numeroSerie,
        String tecnico,      // 👈 Agregado para la tabla
        BigDecimal costo,    // 👈 Agregado para la tabla
        String trabajoRealizado,
        LocalDate garantiaHasta
) {}