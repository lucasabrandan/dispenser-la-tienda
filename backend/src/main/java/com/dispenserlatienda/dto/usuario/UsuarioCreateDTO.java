package com.dispenserlatienda.dto.usuario;

import jakarta.validation.constraints.NotBlank;

public record UsuarioCreateDTO(
        @NotBlank String nombre,
        @NotBlank String username,
        @NotBlank String password,
        @NotBlank String rol,
        String telefono,
        String whatsapp
) {}
