package com.dispenserlatienda.domain.empresa;

import jakarta.persistence.*;
import java.time.LocalDateTime;

// Portal Empresa (7-oct-2026): un pedido de trabajo que carga el cliente empresa
// (reemplaza la tarjeta de Trello). Cuando el admin lo agenda queda vinculado a
// una visita (OrdenVisita) y el estado que ve la empresa sale de esa visita.
@Entity
@Table(name = "pedido_empresa", indexes = {
    @Index(name = "idx_pedido_empresa_cliente", columnList = "cliente_id"),
    @Index(name = "idx_pedido_empresa_orden", columnList = "orden_id")
})
public class PedidoEmpresa {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "cliente_id", nullable = false)
    private Long clienteId;

    @Column(name = "cliente_nombre", length = 200)
    private String clienteNombre;

    @Column(name = "creado_por_id")
    private Long creadoPorId;

    @Column(name = "creado_por_nombre", length = 120)
    private String creadoPorNombre;

    @Column(name = "sede_id")
    private Long sedeId;

    @Column(length = 300)
    private String lugar;

    @Column(length = 400)
    private String direccion;

    @Column(name = "equipo_serie", length = 200)
    private String equipoSerie;

    @Column(length = 120)
    private String motivo;

    @Column(columnDefinition = "TEXT")
    private String detalle;

    @Column(nullable = false)
    private boolean urgente = false;

    // NUEVO | CANCELADO (los demás estados salen de la visita vinculada).
    // String y no enum: la base puede tener CHECK viejos en columnas enum.
    @Column(nullable = false, length = 20)
    private String estado = "NUEVO";

    @Column(name = "orden_id")
    private Long ordenId;

    @Column(name = "creado_en", nullable = false)
    private LocalDateTime creadoEn = LocalDateTime.now();

    @Column(name = "actualizado_en")
    private LocalDateTime actualizadoEn = LocalDateTime.now();

    public Long getId() { return id; }
    public Long getClienteId() { return clienteId; }
    public void setClienteId(Long v) { this.clienteId = v; }
    public String getClienteNombre() { return clienteNombre; }
    public void setClienteNombre(String v) { this.clienteNombre = v; }
    public Long getCreadoPorId() { return creadoPorId; }
    public void setCreadoPorId(Long v) { this.creadoPorId = v; }
    public String getCreadoPorNombre() { return creadoPorNombre; }
    public void setCreadoPorNombre(String v) { this.creadoPorNombre = v; }
    public Long getSedeId() { return sedeId; }
    public void setSedeId(Long v) { this.sedeId = v; }
    public String getLugar() { return lugar; }
    public void setLugar(String v) { this.lugar = v; }
    public String getDireccion() { return direccion; }
    public void setDireccion(String v) { this.direccion = v; }
    public String getEquipoSerie() { return equipoSerie; }
    public void setEquipoSerie(String v) { this.equipoSerie = v; }
    public String getMotivo() { return motivo; }
    public void setMotivo(String v) { this.motivo = v; }
    public String getDetalle() { return detalle; }
    public void setDetalle(String v) { this.detalle = v; }
    public boolean isUrgente() { return urgente; }
    public void setUrgente(boolean v) { this.urgente = v; }
    public String getEstado() { return estado; }
    public void setEstado(String v) { this.estado = v; }
    public Long getOrdenId() { return ordenId; }
    public void setOrdenId(Long v) { this.ordenId = v; }
    public LocalDateTime getCreadoEn() { return creadoEn; }
    public LocalDateTime getActualizadoEn() { return actualizadoEn; }
    public void setActualizadoEn(LocalDateTime v) { this.actualizadoEn = v; }
}
