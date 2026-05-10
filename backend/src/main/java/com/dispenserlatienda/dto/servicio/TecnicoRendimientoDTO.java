package com.dispenserlatienda.dto.servicio;

import java.math.BigDecimal;

public record TecnicoRendimientoDTO(
    String periodo,           // "YYYY-MM"
    int    cantidadServicios,
    BigDecimal totalFacturado,  // cobrado al cliente (con descuento)
    BigDecimal totalImpuestos,  // 30% del facturado
    BigDecimal totalRepuestos,  // costo de repuestos usados
    BigDecimal gananciaNet,     // facturado - impuestos - repuestos
    BigDecimal totalTecnico     // gananciaNet / 2 = parte del técnico
) {}
