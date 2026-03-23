package com.dispenserlatienda.config;

import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.databind.DeserializationContext;
import com.fasterxml.jackson.databind.JsonDeserializer;
import com.dispenserlatienda.domain.cliente.CondicionIva;

import java.io.IOException;

// Deserializer personalizado para CondicionIva
// Maneja strings vacíos y convierte a null
public class CondicionIvaDeserializer extends JsonDeserializer<CondicionIva> {

    @Override
    public CondicionIva deserialize(JsonParser p, DeserializationContext ctxt) throws IOException {
        String value = p.getValueAsString();

        // Si es vacío o null, devolver null
        if (value == null || value.trim().isEmpty()) {
            return null;
        }

        // Intentar parsear como enum
        try {
            return CondicionIva.valueOf(value);
        } catch (IllegalArgumentException e) {
            throw new IOException("Valor inválido para CondicionIva: " + value, e);
        }
    }
}