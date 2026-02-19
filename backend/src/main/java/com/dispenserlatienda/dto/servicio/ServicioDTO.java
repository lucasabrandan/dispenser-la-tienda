package com.dispenserlatienda.dto.servicio;

import com.dispenserlatienda.domain.servicio.ServicioTipo;
import java.time.LocalDate;
import java.util.List;

public record ServicioDTO(
        Long id,
        LocalDate fechaServicio, // 👈 Importante el nombre
        ServicioTipo servicioTipo,
        String nombreSede,       // 👈 Este es el que falta en tu tabla
        List<ServicioItemDTO> items
) {}