package com.dispenserlatienda.service.servicio;

import com.dispenserlatienda.domain.servicio.TrabajoTipo; // 👈 Fijate que tenga este import
import java.time.LocalDate;

public class GarantiaCalculator {

    public static LocalDate calcular(TrabajoTipo tipo) {
        if (tipo == TrabajoTipo.CAMBIO_FILTRO) { // 👈 Ahora Java ya no va a chillar acá
            return LocalDate.now().plusMonths(6);
        }
        return LocalDate.now().plusMonths(3);
    }
}