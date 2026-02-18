package com.dispenserlatienda.dto.servicio;

import com.dispenserlatienda.domain.servicio.TrabajoTipo;
import java.time.LocalDate;

public record ServicioItemDTO(
        Long equipoId,
        String numeroSerie,
        TrabajoTipo trabajoTipo,
        LocalDate garantiaHasta
) {}