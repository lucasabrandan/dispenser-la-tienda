package com.dispenserlatienda.dto.servicio;

import com.dispenserlatienda.domain.servicio.TrabajoTipo;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDate;

public record ServicioItemCreateDTO(
        @NotBlank String equipoSerial,
        @NotBlank String tecnico,
        @NotNull @PositiveOrZero(message = "El costo no puede ser negativo") BigDecimal costo,
        BigDecimal costoInterno,
        String descuento,
        @NotBlank String metodoPago,
        @NotBlank String trabajoRealizado,
        LocalDate garantiaHasta,
        @NotNull TrabajoTipo trabajoTipo,
        String fotoAntes,   // 💡 Agregado
        String fotoDespues  // 💡 Agregado
) {
    public ServicioItemCreateDTO(String equipoSerial, TrabajoTipo trabajoTipo, String trabajoRealizado) {
        this(equipoSerial, "Marcos", BigDecimal.ZERO, BigDecimal.ZERO, "0", "EFECTIVO", trabajoRealizado, null, trabajoTipo, null, null);
    }
}