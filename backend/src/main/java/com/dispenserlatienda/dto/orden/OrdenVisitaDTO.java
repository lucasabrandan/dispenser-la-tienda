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
    Long clienteId,
    String clienteNombre,
    String clienteTelefono,
    String prioridad,
    String estado,
    LocalDate fechaProgramada,
    String horaEstimada,
    String notasTecnico,
    LocalDateTime fechaCompletada,
    LocalDateTime creadoEn,
    java.math.BigDecimal montoEstimado,
    String formaPago,
    Long presupuestoId,
    // Del presupuesto vinculado: si el día/hora todavía está "a coordinar" y qué
    // días/franjas aceptó el cliente (JSON [{dia, franja}]), para que el técnico lo vea.
    Boolean horarioACoordinar,
    String ventanasCliente,
    String equiposSerie,
    // Cuándo el técnico confirmó "Ok, voy" (null = sin confirmar)
    LocalDateTime confirmadaEn
) {}
