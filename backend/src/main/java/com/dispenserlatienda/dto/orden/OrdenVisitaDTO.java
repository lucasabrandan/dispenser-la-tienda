package com.dispenserlatienda.dto.orden;

import java.time.LocalDate;
import java.time.LocalDateTime;

public record OrdenVisitaDTO(
    Long id,
    Long tecnicoId,
    String tecnicoNombre,
    String titulo,
    String descripcion,
    String direccion,
    String clienteNombre,
    String clienteTelefono,
    String prioridad,
    String estado,
    LocalDate fechaProgramada,
    String horaEstimada,
    String notasTecnico,
    LocalDateTime fechaCompletada,
    LocalDateTime creadoEn
) {}
