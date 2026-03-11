package com.dispenserlatienda.domain;

import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import com.dispenserlatienda.config.CondicionIvaDeserializer;

// Enum para condición IVA del cliente
@JsonDeserialize(using = CondicionIvaDeserializer.class)
public enum CondicionIva {
    RESPONSABLE_INSCRIPTO("Responsable Inscripto"),
    MONOTRIBUTO("Monotributo"),
    NO_RESPONSABLE("No Responsable"),
    CONSUMIDOR_FINAL("Consumidor Final");

    private final String descripcion;

    CondicionIva(String descripcion) {
        this.descripcion = descripcion;
    }

    public String getDescripcion() {
        return descripcion;
    }
}
