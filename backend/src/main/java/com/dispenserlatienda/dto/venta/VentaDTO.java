package com.dispenserlatienda.dto.venta;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * DTO para retornar información completa de una venta.
 * Se usa en respuestas de GET, POST, PUT.
 */
public record VentaDTO(
        Long id,
        Long clienteId,
        String clienteNombre,
        String clienteEmail,
        String clienteTelefono,
        LocalDate fecha,
        List<VentaItemDTO> items,
        BigDecimal subtotalCosto,
        BigDecimal subtotalVenta,
        BigDecimal descuentoPorcentaje,
        BigDecimal descuentoMonto,
        BigDecimal iva,
        BigDecimal totalIngreso,
        BigDecimal gananciaReal,
        String estado,
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        String observaciones
) {}