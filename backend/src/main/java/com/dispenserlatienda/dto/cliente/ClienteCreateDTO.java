package com.dispenserlatienda.dto.cliente;

import com.dispenserlatienda.domain.ClienteTipo;
import com.dispenserlatienda.domain.CondicionIva;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

// DTO para crear o actualizar clientes
// Todas las anotaciones @NotBlank, @NotNull aseguran validación automática
public record ClienteCreateDTO(
        @NotNull(message = "El tipo de cliente es obligatorio")
        ClienteTipo clienteTipo,

        @NotBlank(message = "El nombre del cliente es obligatorio")
        String nombre,

        String cuilDni,
        String telefono,
        String email,
        String notas,

        @NotNull(message = "La condición IVA es obligatoria")
        CondicionIva condicionIva,

        @NotBlank(message = "La calle es obligatoria")
        String calle,

        @NotBlank(message = "El número es obligatorio")
        String numero,

        String piso,
        String depto,

        @NotBlank(message = "La localidad es obligatoria")
        String localidad,

        @NotBlank(message = "La provincia es obligatoria")
        String provincia,

        String direccion
) {}
