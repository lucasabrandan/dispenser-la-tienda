package com.dispenserlatienda.domain.servicio;

// Enum que define los métodos de pago aceptados
// Reemplaza al String "metodoPago" que estaba en ServicioItem
// Uso: item.setMetodoPago(MetodoPago.EFECTIVO);
public enum MetodoPago {
    // Pago en efectivo al momento
    EFECTIVO,

    // Pago con tarjeta de débito o crédito
    TARJETA,

    // Transferencia bancaria (CBU/alias)
    TRANSFERENCIA,

    // Cheque (para caso de empresas grandes)
    CHEQUE
}