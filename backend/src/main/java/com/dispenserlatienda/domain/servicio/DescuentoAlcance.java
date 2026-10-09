package com.dispenserlatienda.domain.servicio;

// Sobre qué parte del trabajo se aplica el % de descuento del servicio.
// TOTAL es el comportamiento histórico (y el valor de los registros viejos).
public enum DescuentoAlcance {
    TOTAL,
    MANO_DE_OBRA,
    REPUESTOS;

    // null o desconocido → TOTAL, para no romper presupuestos viejos ni clientes viejos del front
    public static DescuentoAlcance de(String valor) {
        if (valor == null || valor.isBlank()) return TOTAL;
        try { return valueOf(valor.trim().toUpperCase()); } catch (IllegalArgumentException e) { return TOTAL; }
    }

    public static DescuentoAlcance o(DescuentoAlcance a) { return a != null ? a : TOTAL; }
}
