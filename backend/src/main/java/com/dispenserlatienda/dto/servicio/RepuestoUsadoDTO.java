package com.dispenserlatienda.dto.servicio;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.math.BigDecimal;

@JsonIgnoreProperties(ignoreUnknown = true)
public record RepuestoUsadoDTO(
        String nombre,
        String sku,
        String descripcion,
        String fotoUrl,
        Integer cantidad,
        BigDecimal precio,
        BigDecimal subtotal
) {}