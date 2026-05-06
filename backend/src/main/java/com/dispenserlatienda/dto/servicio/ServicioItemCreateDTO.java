package com.dispenserlatienda.dto.servicio;

import com.dispenserlatienda.domain.servicio.TrabajoTipo;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public record ServicioItemCreateDTO(
        @NotBlank String equipoSerial,
        @NotBlank String tecnico,
        @NotNull @PositiveOrZero BigDecimal costo,
        BigDecimal costoExtra,
        List<RepuestoUsadoDTO> repuestosUsados,
        BigDecimal costoInterno,
        String descuento,
        @NotBlank String metodoPago,
        String trabajoRealizado,
        String garantiaHasta, // Recibimos String "yyyy-MM-dd" o null
        @NotNull TrabajoTipo trabajoTipo,
        String fotoAntes,
        String fotoDespues
) {}