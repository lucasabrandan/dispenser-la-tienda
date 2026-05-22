package com.dispenserlatienda.domain.servicio;

public enum ModalidadCobro {
    // Pago en efectivo sin factura (precio base, 50/50 técnico/negocio)
    EFECTIVO_SIN_FACTURA,
    // Con factura (+30% impuestos ARCA, cliente paga extra)
    CON_FACTURA,
    // Aún no definido — admin decide después
    PENDIENTE
}
