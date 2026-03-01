package com.dispenserlatienda.dto.servicio;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * Este es el DTO que viaja desde Java hacia React.
 * Ahora incluye costoExtra y la lista de repuestos desglosada.
 */
public record ServicioItemDTO(
        Long equipoId,
        String equipoSerial,
        String equipoUbicacion,
        String tecnico,
        BigDecimal costo,
        BigDecimal costoExtra,    // 🚀 NUEVO
        BigDecimal costoInterno,
        BigDecimal descuento,
        String metodoPago,
        String trabajoRealizado,
        LocalDate garantiaHasta,
        List<RepuestoUsadoDTO> repuestosUsados, // 🚀 NUEVO: La lista para el PDF
        String fotoAntes,
        String fotoDespues
) {}