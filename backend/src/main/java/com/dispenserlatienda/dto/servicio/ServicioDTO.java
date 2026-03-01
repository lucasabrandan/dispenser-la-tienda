package com.dispenserlatienda.dto.servicio;

import java.time.LocalDate;
import java.util.List;

public record ServicioDTO(
        Long id,
        LocalDate fechaServicio,
        String servicioTipo,
        String clienteNombre,
        String sedeNombre,
        List<ServicioItemDTO> items,
        String estado,
        String fotoRemito // 🚀 AGREGADO: El nombre del archivo para mostrar la foto
) {}