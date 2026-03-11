package com.dispenserlatienda.domain;

// Enum que define las condiciones de IVA válidas en Argentina
// Reemplaza al String "condicionIva" que estaba en Cliente
// Esto es importante para emitir facturas correctamente
// Uso: cliente.setCondicionIva(CondicionIva.RESPONSABLE_INSCRIPTO);
public enum CondicionIva {
    // Empresa registrada en ARCA, emite facturas A
    RESPONSABLE_INSCRIPTO,

    // Personas/empresas que pagan monotributo
    MONOTRIBUTO,

    // Empresa que no está registrada ante AFIP
    NO_RESPONSABLE,

    // Consumidor final sin obligación fiscal
    CONSUMIDOR_FINAL
}
