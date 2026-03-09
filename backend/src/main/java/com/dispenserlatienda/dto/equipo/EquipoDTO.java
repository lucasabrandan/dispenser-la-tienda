package com.dispenserlatienda.dto.equipo;

public record EquipoDTO(
        Long id,
        String numeroSerie,
        String marca,
        String modelo,
        String ubicacion,
        String observaciones
) {}