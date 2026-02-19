package com.dispenserlatienda.dto.servicio;

import com.dispenserlatienda.domain.servicio.TrabajoTipo;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDate;

public record ServicioItemCreateDTO(
        @NotBlank String equipoSerial,
        @NotBlank String tecnico,
        @NotNull @PositiveOrZero(message = "El costo no puede ser negativo") BigDecimal costo,
        String descuento, // 👈 DEBE SER STRING para recibir el "%"
        @NotBlank String metodoPago,
        @NotBlank String trabajoRealizado,
        LocalDate garantiaHasta,
        @NotNull TrabajoTipo trabajoTipo
) {
    public ServicioItemCreateDTO(String equipoSerial, TrabajoTipo trabajoTipo, String trabajoRealizado) {
        this(equipoSerial, "Marcos", BigDecimal.ZERO, "0", "EFECTIVO", trabajoRealizado, null, trabajoTipo);
    }
}