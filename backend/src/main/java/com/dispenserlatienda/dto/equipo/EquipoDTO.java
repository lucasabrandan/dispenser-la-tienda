package com.dispenserlatienda.dto.equipo;

public record EquipoDTO(
        Long id,
        Long sedeId,
        String numeroSerie,
        String marca,
        String modelo,
        String ubicacion,
        String piso,
        String sector,
        String observaciones
) {}