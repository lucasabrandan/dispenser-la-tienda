package com.dispenserlatienda.dto.repuesto;

public record RepuestoCreateDTO(
        String nombre,
        String descripcion,
        String codigoInterno,
        java.math.BigDecimal costoUnitario,
        java.math.BigDecimal precioListaUnitario,
        Integer stock
) {}