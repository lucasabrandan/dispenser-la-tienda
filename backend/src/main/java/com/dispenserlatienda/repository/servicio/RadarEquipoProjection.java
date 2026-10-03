package com.dispenserlatienda.repository.servicio;

import java.time.LocalDate;

public interface RadarEquipoProjection {
    String getSerial();
    String getClienteNombre();
    String getSedeNombre();
    String getClienteTelefono();
    Long getClienteId();
    LocalDate getUltimoServicio();
    LocalDate getUltimoFiltro();
}
