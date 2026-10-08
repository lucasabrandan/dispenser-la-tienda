package com.dispenserlatienda.dto.empresa;

import java.time.LocalDate;
import java.time.LocalDateTime;

// estado: NUEVO | AGENDADO | EN_CAMINO | EN_CURSO | HECHO | NO_ATENDIDO | PAUSADO | CANCELADO
public record PedidoEmpresaDTO(
    Long id,
    Long clienteId,
    String clienteNombre,
    String creadoPorNombre,
    Long sedeId,
    String lugar,
    String direccion,
    String equipoSerie,
    String motivo,
    String detalle,
    boolean urgente,
    String estado,
    Long ordenId,
    LocalDate fecha,
    String hora,
    String tecnicoNombre,
    long comentarios,
    LocalDateTime creadoEn,
    LocalDateTime actualizadoEn,
    java.util.List<String> fotos,
    String conformidad,
    Integer calificacion,
    String conformidadComentario,
    LocalDateTime conformidadEn,
    String conformidadPor
) {}
