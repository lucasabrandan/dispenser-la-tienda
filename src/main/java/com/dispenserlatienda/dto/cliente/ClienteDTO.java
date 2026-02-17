package com.dispenserlatienda.dto.cliente;

import com.dispenserlatienda.domain.ClienteTipo;

public record ClienteDTO(
        Long id,
        ClienteTipo tipo,
        String razonSocialNombre,
        String cuilDni,
        String telefono,
        String email,
        String notas
) {}