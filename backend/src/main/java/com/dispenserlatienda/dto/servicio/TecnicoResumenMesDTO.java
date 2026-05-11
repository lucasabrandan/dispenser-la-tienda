package com.dispenserlatienda.dto.servicio;

import java.math.BigDecimal;

public record TecnicoResumenMesDTO(
    Long       tecnicoId,
    String     tecnicoNombre,
    String     periodo,            // "YYYY-MM"
    int        cantidadTrabajos,
    BigDecimal totalFacturado,
    BigDecimal totalImpuestos,
    BigDecimal totalRepuestos,
    BigDecimal gananciaNet,
    BigDecimal parteTecnico
) {}
