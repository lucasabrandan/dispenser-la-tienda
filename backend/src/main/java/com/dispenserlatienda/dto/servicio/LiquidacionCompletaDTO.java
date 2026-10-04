package com.dispenserlatienda.dto.servicio;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

// Liquidación + cuentas del mes + cierre (5-oct-2026).
// saldo > 0: DLT le debe al técnico. saldo < 0: el técnico le debe a DLT.
public record LiquidacionCompletaDTO(
    LiquidacionDTO base,
    Cuentas cuentas,
    List<Movimiento> movimientos,
    Cierre cierre
) {
    public record Cuentas(
        BigDecimal parteTecnico,
        BigDecimal efectivoCobrado,   // efectivo de trabajos de DLT que cobró él
        BigDecimal rendido,           // rendiciones del día que el admin marcó "Recibido"
        BigDecimal entregado,         // otras entregas de efectivo a DLT
        BigDecimal efectivoEnMano,    // efectivoCobrado − rendido − entregado
        BigDecimal pagado,            // lo que DLT ya le pagó
        BigDecimal saldo              // parteTecnico − efectivoEnMano − pagado
    ) {}
    public record Movimiento(Long id, LocalDate fecha, String tipo, BigDecimal monto, String nota) {}
    public record Cierre(boolean cerrado, LocalDateTime cerradoEn, LocalDateTime aceptadoEn) {}
    // Lo que se congela al cerrar el mes
    public record Snapshot(LiquidacionDTO base, Cuentas cuentas, List<Movimiento> movimientos) {}
}
