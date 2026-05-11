package com.dispenserlatienda.dto.radar;

import java.time.LocalDate;

public class RadarAlertaDTO {

    private String serial;
    private String clienteNombre;
    private String sedeNombre;
    private String clienteTelefono;
    private LocalDate fechaUltimoServicio;
    private LocalDate fechaUltimoFiltro;
    private String tipoAlerta;   // "FILTRO" | "SANITIZACION"
    private int meses;

    public RadarAlertaDTO() {}

    public String getSerial()                      { return serial; }
    public void   setSerial(String v)              { this.serial = v; }

    public String getClienteNombre()               { return clienteNombre; }
    public void   setClienteNombre(String v)       { this.clienteNombre = v; }

    public String getSedeNombre()                  { return sedeNombre; }
    public void   setSedeNombre(String v)          { this.sedeNombre = v; }

    public String getClienteTelefono()             { return clienteTelefono; }
    public void   setClienteTelefono(String v)     { this.clienteTelefono = v; }

    public LocalDate getFechaUltimoServicio()      { return fechaUltimoServicio; }
    public void      setFechaUltimoServicio(LocalDate v) { this.fechaUltimoServicio = v; }

    public LocalDate getFechaUltimoFiltro()        { return fechaUltimoFiltro; }
    public void      setFechaUltimoFiltro(LocalDate v)   { this.fechaUltimoFiltro = v; }

    public String getTipoAlerta()                  { return tipoAlerta; }
    public void   setTipoAlerta(String v)          { this.tipoAlerta = v; }

    public int  getMeses()                         { return meses; }
    public void setMeses(int v)                    { this.meses = v; }
}
