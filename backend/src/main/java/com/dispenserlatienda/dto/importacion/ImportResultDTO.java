package com.dispenserlatienda.dto.importacion;

import java.util.List;

public record ImportResultDTO(
    int importados,
    int errores,
    List<String> detalleErrores
) {}
