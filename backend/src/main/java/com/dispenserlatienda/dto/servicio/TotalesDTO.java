package com.dispenserlatienda.dto.servicio;

import java.math.BigDecimal;

// Desglose del total de un servicio, calculado SOLO en el backend (CalculoTotales).
// El front y los PDFs muestran estos valores; no recalculan.
public record TotalesDTO(
        BigDecimal manoDeObra,          // suma de mano de obra de los ítems
        BigDecimal repuestos,           // suma de repuestos (costo − mano de obra)
        BigDecimal subtotal,            // manoDeObra + repuestos
        String descuentoAlcance,        // TOTAL | MANO_DE_OBRA | REPUESTOS
        BigDecimal descuentoPorcentaje, // 0–100
        BigDecimal baseDescuento,       // sobre qué monto se aplicó el %
        BigDecimal descuentoMonto,      // redondeado a 2 decimales
        BigDecimal total                // subtotal − descuentoMonto
) {}
