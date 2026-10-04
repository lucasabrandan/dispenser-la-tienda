package com.dispenserlatienda.dto.servicio;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

// Liquidación mensual del técnico/socio (4-oct-2026). La ven el admin y el
// propio técnico con los mismos números. Por trabajo cobrado:
// cobrado − productos (precio de venta, los pone el negocio)
//         − impuestos (solo si se facturó) = mano de obra neta → 50% / 50%.
// Nunca expone costos internos de productos.
public record LiquidacionDTO(
    Long tecnicoId,
    String tecnicoNombre,
    String mes,
    int porcentajeImpuestos,
    int porcentajeTecnico,
    List<Linea> trabajos,
    List<Pendiente> pendientes,
    BigDecimal totalCobrado,
    BigDecimal totalProductos,
    BigDecimal totalImpuestos,
    BigDecimal totalNeto,
    BigDecimal parteTecnico,
    BigDecimal parteNegocio
) {
    public record Linea(
        Long servicioId, LocalDate fecha, String cliente, String detalle, String cobro,
        BigDecimal cobrado, BigDecimal productos, BigDecimal impuestos,
        BigDecimal neto, BigDecimal parteTecnico
    ) {}

    public record Pendiente(
        Long servicioId, LocalDate fecha, String cliente, String detalle, String estado, BigDecimal monto
    ) {}
}
