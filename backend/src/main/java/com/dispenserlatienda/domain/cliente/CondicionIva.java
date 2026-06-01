package com.dispenserlatienda.domain.cliente;

import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import com.dispenserlatienda.config.CondicionIvaDeserializer;

// Enum para condición IVA del cliente
@JsonDeserialize(using = CondicionIvaDeserializer.class)
public enum CondicionIva {
    RESPONSABLE_INSCRIPTO("Responsable Inscripto"),
    MONOTRIBUTO("Monotributo"),
    EXENTO("IVA Exento"),
    NO_RESPONSABLE("IVA No Responsable"),
    CONSUMIDOR_FINAL("Consumidor Final"),
    SUJETO_NO_CATEGORIZADO("Sujeto No Categorizado");

    private final String descripcion;

    CondicionIva(String descripcion) {
        this.descripcion = descripcion;
    }

    public String getDescripcion() {
        return descripcion;
    }
}
