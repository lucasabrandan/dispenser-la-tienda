package com.dispenserlatienda.dto.sede;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record SedeCreateDTO(
        @NotNull Long clienteId,
        @NotBlank String nombreSede,

        // 📍 Campos de Logística desglosados
        String calle,
        String numero,
        String piso,
        String depto,
        String localidad,
        String provincia,
        String direccion, // El string combinado que armamos en el frontend

        String notas
) {}