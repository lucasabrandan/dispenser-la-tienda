package com.dispenserlatienda.dto.venta;

import java.math.BigDecimal;

/**
 * DTO para items individuales de una venta.
 * Incluye toda la información de un producto vendido.
 */
public record VentaItemDTO(
        Long id,
        String descripcion,
        Integer cantidad,
        BigDecimal costoUnitario,
        BigDecimal precioListaUnitario,
        BigDecimal precioAplicadoUnitario,
        BigDecimal gananciaUnitaria,
        BigDecimal subtotalCosto,
        BigDecimal subtotalVenta,
        BigDecimal gananciaTotalItem
) {}