package com.dispenserlatienda.service.servicio;

import com.dispenserlatienda.domain.servicio.TrabajoTipo;
import java.time.LocalDate;

// Regla de garantía (Lucas, 29-sep-2026): 3 meses para todo trabajo, incluido
// cambio de filtro. Hoy la garantía real la calcula ServicioService con la fecha
// del servicio; esto queda alineado por si se vuelve a usar.
public class GarantiaCalculator {

    public static LocalDate calcular(TrabajoTipo tipo) {
        return LocalDate.now().plusMonths(3);
    }
}
