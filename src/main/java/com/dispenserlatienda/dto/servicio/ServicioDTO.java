package com.dispenserlatienda.dto.servicio;

import com.dispenserlatienda.domain.servicio.ServicioTipo;
import java.time.LocalDate;
import java.util.List;

public record ServicioDTO(
        Long id,
        LocalDate fecha,
        ServicioTipo servicioTipo,
        String sedeNombre,
        List<ServicioItemDTO> items
) {}