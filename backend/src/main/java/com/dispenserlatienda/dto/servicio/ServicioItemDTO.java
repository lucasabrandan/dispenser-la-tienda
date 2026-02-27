package com.dispenserlatienda.dto.servicio;

import java.math.BigDecimal;
import java.time.LocalDate;

public record ServicioItemDTO(
        Long equipoId,
        String equipoSerial,
        String equipoUbicacion, // 💡 NUEVO: Acá viaja "Piso 5 - Sala de Médicos"
        String tecnico,
        BigDecimal costo,
        BigDecimal costoInterno,
        BigDecimal descuento,
        String metodoPago,
        String trabajoRealizado,
        LocalDate garantiaHasta,
        String fotoAntes,
        String fotoDespues
) {}