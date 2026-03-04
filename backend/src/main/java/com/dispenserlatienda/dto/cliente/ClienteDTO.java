package com.dispenserlatienda.dto.cliente;

import com.dispenserlatienda.domain.ClienteTipo;

/**
 * Record DTO para el listado y detalle de clientes.
 * Debe coincidir exactamente con el orden del Service.
 */
public record ClienteDTO(
        Long id,
        ClienteTipo tipo,
        String nombre,
        String cuilDni,
        String telefono,
        String email,
        String notas,
        String condicionIva, // 8
        String calle,        // 9
        String numero,       // 10
        String piso,         // 11
        String depto,        // 12
        String localidad,    // 13
        String provincia,    // 14
        String direccion     // 15
) {}