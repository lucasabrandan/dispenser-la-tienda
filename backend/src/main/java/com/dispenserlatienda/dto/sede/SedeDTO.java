package com.dispenserlatienda.dto.sede;

public record SedeDTO(
        Long id,
        Long clienteId,
        String clienteNombre,
        String nombreSede,
        String direccion,
        String localidad,
        String notas
) {}