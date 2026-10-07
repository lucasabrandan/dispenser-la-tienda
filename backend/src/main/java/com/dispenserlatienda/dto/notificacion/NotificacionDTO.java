package com.dispenserlatienda.dto.notificacion;

import java.time.LocalDateTime;

public record NotificacionDTO(
    Long id,
    String tipo,
    String titulo,
    String mensaje,
    String origenNombre,
    Long referenciaId,
    boolean leida,
    LocalDateTime creadoEn,
    // "Tarjeta" de la visita/trabajo al que apunta (7-oct-2026): la usan el push,
    // el aviso urgente y la campanita para mostrar cliente, día/hora, técnico y dirección.
    Long ordenId,
    String clienteNombre,
    java.time.LocalDate fecha,
    String hora,
    String tecnicoNombre,
    String direccion
) {}
