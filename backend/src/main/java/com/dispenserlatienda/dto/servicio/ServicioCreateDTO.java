package com.dispenserlatienda.dto.servicio;

import com.dispenserlatienda.domain.servicio.ServicioTipo;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public class ServicioCreateDTO {
    @NotNull private Long sedeId;
    @NotNull private Long usuarioId;
    @NotNull private String fecha; // Recibimos "yyyy-MM-dd"
    @NotNull private ServicioTipo servicioTipo;
    private String clienteNombre;
    private String sedeNombre;
    private String observaciones;
    @Valid @NotEmpty private List<ServicioItemCreateDTO> items;
    private String estado;
    private String fotoRemito;
    private java.math.BigDecimal descuentoPorcentaje;
    private Long presupuestoOrigenId;
    private Long ordenId;
    private String modalidadCobro;
    private java.math.BigDecimal montoFinal;
    private Boolean esVisita;
    private java.math.BigDecimal abonoVisita;
    private Long presupuestoVisitaId;

    public ServicioCreateDTO() {}

    // GETTERS Y SETTERS COMPLETOS
    public Long getSedeId() { return sedeId; }
    public void setSedeId(Long sedeId) { this.sedeId = sedeId; }
    public Long getUsuarioId() { return usuarioId; }
    public void setUsuarioId(Long usuarioId) { this.usuarioId = usuarioId; }
    public String getFecha() { return fecha; }
    public void setFecha(String fecha) { this.fecha = fecha; }
    public ServicioTipo getServicioTipo() { return servicioTipo; }
    public void setServicioTipo(ServicioTipo servicioTipo) { this.servicioTipo = servicioTipo; }
    public String getClienteNombre() { return clienteNombre; }
    public void setClienteNombre(String clienteNombre) { this.clienteNombre = clienteNombre; }
    public String getSedeNombre() { return sedeNombre; }
    public void setSedeNombre(String sedeNombre) { this.sedeNombre = sedeNombre; }
    public String getObservaciones() { return observaciones; }
    public void setObservaciones(String observaciones) { this.observaciones = observaciones; }
    public List<ServicioItemCreateDTO> getItems() { return items; }
    public void setItems(List<ServicioItemCreateDTO> items) { this.items = items; }
    public String getEstado() { return estado; }
    public void setEstado(String estado) { this.estado = estado; }
    public String getFotoRemito() { return fotoRemito; }
    public void setFotoRemito(String fotoRemito) { this.fotoRemito = fotoRemito; }
    public java.math.BigDecimal getDescuentoPorcentaje() { return descuentoPorcentaje; }
    public void setDescuentoPorcentaje(java.math.BigDecimal descuentoPorcentaje) { this.descuentoPorcentaje = descuentoPorcentaje; }
    public Long getPresupuestoOrigenId() { return presupuestoOrigenId; }
    public void setPresupuestoOrigenId(Long presupuestoOrigenId) { this.presupuestoOrigenId = presupuestoOrigenId; }
    public Long getOrdenId() { return ordenId; }
    public void setOrdenId(Long ordenId) { this.ordenId = ordenId; }
    public String getModalidadCobro() { return modalidadCobro; }
    public void setModalidadCobro(String modalidadCobro) { this.modalidadCobro = modalidadCobro; }
    public java.math.BigDecimal getMontoFinal() { return montoFinal; }
    public void setMontoFinal(java.math.BigDecimal montoFinal) { this.montoFinal = montoFinal; }
    public Boolean getEsVisita() { return esVisita; }
    public void setEsVisita(Boolean esVisita) { this.esVisita = esVisita; }
    public java.math.BigDecimal getAbonoVisita() { return abonoVisita; }
    public void setAbonoVisita(java.math.BigDecimal abonoVisita) { this.abonoVisita = abonoVisita; }
    public Long getPresupuestoVisitaId() { return presupuestoVisitaId; }
    public void setPresupuestoVisitaId(Long presupuestoVisitaId) { this.presupuestoVisitaId = presupuestoVisitaId; }
}