package com.dispenserlatienda.dto.equipo;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record EquipoCreateDTO(
        @NotBlank String numeroSerie,
        String modelo,
        String marca,
        @NotNull Long sedeId,
        String ubicacion,
        String piso,
        String sector,
        String observaciones
) {}