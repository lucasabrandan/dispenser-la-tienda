package com.dispenserlatienda.dto.servicio;

import com.dispenserlatienda.domain.servicio.ServicioTipo;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.util.List;

public record ServicioCreateDTO(
        @NotNull Long sedeId,
        @NotNull Long usuarioId,
        @NotNull LocalDate fecha,
        @NotNull ServicioTipo servicioTipo,
        String observaciones,
        @NotEmpty List<ServicioItemCreateDTO> items // Al menos debe haber un equipo atendido
) {}