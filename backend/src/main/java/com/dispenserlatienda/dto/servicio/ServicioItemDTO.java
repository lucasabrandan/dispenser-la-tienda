package com.dispenserlatienda.dto.servicio;

import java.math.BigDecimal;
import java.util.List;

/**
 * Este es el DTO que viaja desde Java hacia React.
 * Se cambió LocalDate a String para evitar errores de conversión en el mapeo.
 */
public record ServicioItemDTO(
        Long equipoId,
        String equipoSerial,
        String equipoUbicacion,
        String tecnico,
        BigDecimal costo,
        BigDecimal costoExtra,
        BigDecimal costoInterno,
        BigDecimal descuento,
        String metodoPago,
        String trabajoRealizado,
        String garantiaHasta, // 🚀 CAMBIADO: De LocalDate a String
        List<RepuestoUsadoDTO> repuestosUsados,
        String fotoAntes,
        String fotoDespues
) {}