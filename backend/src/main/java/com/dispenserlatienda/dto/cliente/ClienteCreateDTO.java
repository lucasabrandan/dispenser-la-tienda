package com.dispenserlatienda.dto.cliente;

import com.dispenserlatienda.domain.ClienteTipo;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record ClienteCreateDTO(
        @NotNull ClienteTipo clienteTipo,
        @NotBlank String nombre,
        @NotBlank String cuilDni,
        String telefono,
        String email,
        String notas,
        String condicionIva, // ✅ AGREGADO: Para ARCA 2026
        String calle,        // ✅ AGREGADO: Para Logística
        String numero,
        String piso,
        String depto,
        String localidad,
        String provincia,
        String direccion
) {}