package com.dispenserlatienda.dto.venta;

import java.math.BigDecimal;

/**
 * DTO para retornar estadísticas de ventas en un período.
 * Usado en dashboards y reportes.
 */
public record VentasEstadisticasDTO(
        long totalVentas,
        BigDecimal totalIngresos,
        BigDecimal totalCostos,
        BigDecimal totalGanancia,
        BigDecimal margenPorcentaje
) {}