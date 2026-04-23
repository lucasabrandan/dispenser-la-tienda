package com.dispenserlatienda.dto.usuario;

import jakarta.validation.constraints.NotBlank;

public record UsuarioUpdateDTO(
        @NotBlank String nombre,
        @NotBlank String rol,
        boolean activo
) {}
