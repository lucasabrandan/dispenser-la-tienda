package com.dispenserlatienda.dto.cliente;

import com.dispenserlatienda.domain.ClienteTipo;
import com.dispenserlatienda.domain.CondicionIva;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

// Este DTO se usa para crear o actualizar clientes
// CAMBIO: condicionIva ahora es CondicionIva enum en lugar de String
public record ClienteCreateDTO(
        @NotNull ClienteTipo clienteTipo,
        @NotBlank String nombre,
        @NotBlank String cuilDni,
        String telefono,
        String email,
        String notas,
        @NotNull CondicionIva condicionIva,  // CAMBIO: Enum en lugar de String
        String calle,
        String numero,
        String piso,
        String depto,
        String localidad,
        String provincia,
        String direccion
) {}
