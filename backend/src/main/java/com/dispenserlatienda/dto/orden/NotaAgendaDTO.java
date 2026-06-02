package com.dispenserlatienda.dto.orden;

import java.time.LocalDate;

public record NotaAgendaDTO(
    Long id,
    Long tecnicoId,
    String tecnicoNombre,
    LocalDate fecha,
    String horaEstimada,
    String titulo,
    String descripcion,
    String direccion,
    boolean completada
) {}
