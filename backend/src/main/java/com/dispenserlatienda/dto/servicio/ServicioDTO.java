package com.dispenserlatienda.dto.servicio;

import java.util.List;

public record ServicioDTO(
        Long id,
        String fecha,
        String servicioTipo,
        String clienteNombre,
        String clienteTelefono,
        String clienteEmail,
        String clienteDni,
        String clienteCondicionIva,
        String sedeNombre,
        String sedeDireccion,
        List<ServicioItemDTO> items,
        String estado,
        String fotoRemito
) {}
