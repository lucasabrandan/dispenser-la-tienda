package com.dispenserlatienda.dto.servicio;

import java.time.LocalDate;
import java.util.List;

public record ServicioDTO(
        Long id,
        String fecha, // 🚀 DEBE SER STRING
        String servicioTipo,
        String clienteNombre,
        String sedeNombre,
        List<ServicioItemDTO> items,
        String estado,
        String fotoRemito
) {}