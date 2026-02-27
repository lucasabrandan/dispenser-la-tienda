package com.dispenserlatienda.dto.servicio;

import java.time.LocalDate;
import java.util.List;

public record ServicioDTO(
        Long id,
        LocalDate fechaServicio,
        String servicioTipo,
        String clienteNombre, // 💡 NUEVO: El nombre del Sanatorio
        String sedeNombre,    // Acá iría "Edificio Córdoba"
        List<ServicioItemDTO> items,
        String estado
) {}