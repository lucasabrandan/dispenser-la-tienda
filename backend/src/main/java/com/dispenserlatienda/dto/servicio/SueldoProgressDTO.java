package com.dispenserlatienda.dto.servicio;

import java.math.BigDecimal;
import java.util.List;

public record SueldoProgressDTO(
    String mes,
    Long usuarioId,
    String usuarioNombre,
    BigDecimal sueldoObjetivo,
    // Desglose de ingresos
    BigDecimal ingresoServiciosPropios,
    int cantServiciosPropios,
    BigDecimal ingresoServiciosTecnicos,
    int cantServiciosTecnicos,
    BigDecimal ingresoVentas,
    int cantVentas,
    // Total acumulado hacia sueldo
    BigDecimal totalAcumulado,
    BigDecimal faltante,
    double porcentajeProgreso,
    // Resultado empresa (solo admin)
    BigDecimal resultadoEmpresa,
    BigDecimal gastosOperativos,
    // Evolución mensual
    List<MesResumen> evolucion
) {
    public record MesResumen(
        String mes,
        BigDecimal acumulado,
        BigDecimal objetivo,
        BigDecimal resultadoEmpresa,
        int totalTrabajos
    ) {}
}
