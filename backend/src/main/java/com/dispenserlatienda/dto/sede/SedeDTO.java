package com.dispenserlatienda.dto.sede;

import com.dispenserlatienda.dto.equipo.EquipoDTO; // Importante
import java.util.List;

public record SedeDTO(
        Long id,
        Long clienteId,
        String clienteNombre,
        String nombreSede,
        String calle,
        String numero,
        String piso,
        String depto,
        String localidad,
        String provincia,
        String direccion,
        String notas,
        List<EquipoDTO> equipos //
) {}