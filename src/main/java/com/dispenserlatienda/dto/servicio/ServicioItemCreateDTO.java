package com.dispenserlatienda.dto.servicio;

import com.dispenserlatienda.domain.servicio.TrabajoTipo;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record ServicioItemCreateDTO(
        @NotNull Long equipoId,
        @NotNull TrabajoTipo trabajoTipo,
        @NotBlank String trabajoRealizado
) {}