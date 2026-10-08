package com.dispenserlatienda.dto.usuario;

import jakarta.validation.constraints.NotBlank;

public record UsuarioUpdateDTO(
        @NotBlank String nombre,
        @NotBlank String rol,
        boolean activo,
        String telefono,
        String whatsapp,
        Long clienteId, // solo rol EMPRESA (Portal Empresa)
        Long sedeId     // EMPRESA: encargado de un solo lugar (null = toda la empresa)
) {}
