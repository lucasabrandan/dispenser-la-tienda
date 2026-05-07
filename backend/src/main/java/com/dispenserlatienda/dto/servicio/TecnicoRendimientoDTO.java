package com.dispenserlatienda.dto.servicio;

import java.math.BigDecimal;

public record TecnicoRendimientoDTO(
    String periodo,           // "YYYY-MM"
    int    cantidadServicios,
    BigDecimal totalFacturado,
    BigDecimal totalGanancia
) {}
