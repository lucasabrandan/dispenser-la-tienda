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
    LocalDateTime creadoEn
) {}
