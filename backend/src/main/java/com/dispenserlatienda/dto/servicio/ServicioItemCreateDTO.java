package com.dispenserlatienda.dto.servicio;

import com.dispenserlatienda.domain.servicio.TrabajoTipo;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * DTO para crear un item de servicio.
 * Incluye constructor de compatibilidad para no romper el ServicioService viejo.
 */
public record ServicioItemCreateDTO(
        @NotNull Long equipoId,
        @NotBlank String tecnico,
        @NotNull BigDecimal costo,
        @NotBlank String trabajoRealizado,
        LocalDate garantiaHasta,
        @NotNull TrabajoTipo trabajoTipo
) {
    // 🛡️ Constructor de compatibilidad:
    // Si el Service viejo intenta crear el DTO con 3 datos, este le pone el resto.
    public ServicioItemCreateDTO(Long equipoId, TrabajoTipo trabajoTipo, String trabajoRealizado) {
        this(
                equipoId,
                "Marcos",          // Técnico por defecto
                BigDecimal.ZERO,   // Costo cero por defecto
                trabajoRealizado,
                null,
                trabajoTipo
        );
    }
}