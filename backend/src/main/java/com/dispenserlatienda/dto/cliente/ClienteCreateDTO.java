package com.dispenserlatienda.dto.cliente;

import com.dispenserlatienda.domain.ClienteTipo;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record ClienteCreateDTO(
        @NotNull ClienteTipo tipo,
        @NotBlank String razonSocialNombre,
        @NotBlank String cuilDni,
        String telefono,
        String email,
        String notas
) {}