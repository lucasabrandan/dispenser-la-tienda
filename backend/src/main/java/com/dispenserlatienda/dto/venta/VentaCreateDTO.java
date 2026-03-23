package com.dispenserlatienda.dto.venta;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * DTO para crear/actualizar una venta.
 * Contiene solo los datos que el usuario proporciona.
 * Los totales se calculan automáticamente en el service.
 */
public record VentaCreateDTO(
        Long clienteId,
        LocalDate fecha,
        List<VentaItemDTO> items,
        BigDecimal descuentoPorcentaje,
        String observaciones
) {}