package com.dispenserlatienda.dto.repuesto;

public record RepuestoDTO(
        Long id,
        String nombre,
        String descripcion,
        String codigoInterno,
        java.math.BigDecimal costoUnitario,
        java.math.BigDecimal precioListaUnitario,
        Integer stock
) {}