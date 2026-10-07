package com.dispenserlatienda.dto.empresa;

import java.time.LocalDateTime;

public record PedidoComentarioDTO(Long id, String autorNombre, boolean deEmpresa, String texto, LocalDateTime creadoEn) {}
