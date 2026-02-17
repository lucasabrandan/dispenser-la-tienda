package com.dispenserlatienda.dto.sede;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record SedeCreateDTO(
        @NotNull Long clienteId,
        @NotBlank String nombreSede,
        String direccion,
        String localidad,
        String notas
) {}