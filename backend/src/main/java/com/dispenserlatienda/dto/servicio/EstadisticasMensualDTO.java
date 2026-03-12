package com.dispenserlatienda.dto.servicio;

import java.math.BigDecimal;
import java.util.List;

/**
 * EstadisticasMensualDTO
 * Respuesta con análisis financiero del mes
 */
public class EstadisticasMensualDTO {
    private String mes;
    private BigDecimal facturacion;
    private BigDecimal costoRepuestos;
    private BigDecimal gastosVarios;
    private BigDecimal gananciaReal;
    private List<TransaccionDTO> transacciones;

    public EstadisticasMensualDTO() {}

    public EstadisticasMensualDTO(String mes, BigDecimal facturacion, BigDecimal costoRepuestos,
                                  BigDecimal gastosVarios, BigDecimal gananciaReal,
                                  List<TransaccionDTO> transacciones) {
        this.mes = mes;
        this.facturacion = facturacion;
        this.costoRepuestos = costoRepuestos;
        this.gastosVarios = gastosVarios;
        this.gananciaReal = gananciaReal;
        this.transacciones = transacciones;
    }

    // Getters y Setters
    public String getMes() { return mes; }
    public void setMes(String mes) { this.mes = mes; }

    public BigDecimal getFacturacion() { return facturacion; }
    public void setFacturacion(BigDecimal facturacion) { this.facturacion = facturacion; }

    public BigDecimal getCostoRepuestos() { return costoRepuestos; }
    public void setCostoRepuestos(BigDecimal costoRepuestos) { this.costoRepuestos = costoRepuestos; }

    public BigDecimal getGastosVarios() { return gastosVarios; }
    public void setGastosVarios(BigDecimal gastosVarios) { this.gastosVarios = gastosVarios; }

    public BigDecimal getGananciaReal() { return gananciaReal; }
    public void setGananciaReal(BigDecimal gananciaReal) { this.gananciaReal = gananciaReal; }

    public List<TransaccionDTO> getTransacciones() { return transacciones; }
    public void setTransacciones(List<TransaccionDTO> transacciones) { this.transacciones = transacciones; }

    /**
     * TransaccionDTO - Desglose de cada operación
     */
    public static class TransaccionDTO {
        private Long id;
        private String fecha;
        private String concepto;
        private BigDecimal costo;
        private BigDecimal venta;
        private String tipo; // VENTA o TRABAJO

        public TransaccionDTO() {}

        public TransaccionDTO(Long id, String fecha, String concepto, BigDecimal costo,
                              BigDecimal venta, String tipo) {
            this.id = id;
            this.fecha = fecha;
            this.concepto = concepto;
            this.costo = costo;
            this.venta = venta;
            this.tipo = tipo;
        }

        // Getters y Setters
        public Long getId() { return id; }
        public void setId(Long id) { this.id = id; }

        public String getFecha() { return fecha; }
        public void setFecha(String fecha) { this.fecha = fecha; }

        public String getConcepto() { return concepto; }
        public void setConcepto(String concepto) { this.concepto = concepto; }

        public BigDecimal getCosto() { return costo; }
        public void setCosto(BigDecimal costo) { this.costo = costo; }

        public BigDecimal getVenta() { return venta; }
        public void setVenta(BigDecimal venta) { this.venta = venta; }

        public String getTipo() { return tipo; }
        public void setTipo(String tipo) { this.tipo = tipo; }
    }
}