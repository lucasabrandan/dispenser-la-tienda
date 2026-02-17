package com.dispenserlatienda.dto.equipo;

public record EquipoSugerenciaDTO(
        Long id,
        String numeroSerie,
        String modelo,
        Long sedeId,
        String nombreSede
) {}