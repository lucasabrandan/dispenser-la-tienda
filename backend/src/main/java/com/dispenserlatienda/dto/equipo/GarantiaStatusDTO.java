package com.dispenserlatienda.dto.equipo;

import java.time.LocalDate;

public record GarantiaStatusDTO(
        Long equipoId,
        String numeroSerie,
        boolean enGarantia,
        LocalDate garantiaHasta
) {}