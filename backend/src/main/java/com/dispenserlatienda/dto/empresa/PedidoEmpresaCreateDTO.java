package com.dispenserlatienda.dto.empresa;

public record PedidoEmpresaCreateDTO(
    Long sedeId,
    String lugar,
    String direccion,
    String equipoSerie,
    String motivo,
    String detalle,
    Boolean urgente,
    java.util.List<String> fotos
) {}
