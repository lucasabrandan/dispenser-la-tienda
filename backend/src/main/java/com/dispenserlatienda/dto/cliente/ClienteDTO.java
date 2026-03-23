package com.dispenserlatienda.dto.cliente;

import com.dispenserlatienda.domain.cliente.ClienteTipo;
import com.dispenserlatienda.dto.sede.SedeDTO; // ⬅️ Importamos el DTO de sedes
import java.util.List;

public record ClienteDTO(
        Long id,
        ClienteTipo tipo,
        String nombre,
        String cuilDni,
        String telefono,
        String email,
        String notas,
        String condicionIva,
        String calle,
        String numero,
        String piso,
        String depto,
        String localidad,
        String provincia,
        String direccion,
        List<SedeDTO> sedes
) {}