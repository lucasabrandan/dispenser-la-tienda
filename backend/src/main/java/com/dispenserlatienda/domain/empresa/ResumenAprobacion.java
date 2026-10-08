package com.dispenserlatienda.domain.empresa;

import jakarta.persistence.*;
import java.time.LocalDateTime;

// La empresa aprueba (u observa) el resumen del mes antes de facturar (8-oct-2026)
@Entity
@Table(name = "resumen_aprobacion", uniqueConstraints = @UniqueConstraint(name = "uk_resumen_aprob", columnNames = {"cliente_id", "mes"}))
public class ResumenAprobacion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "cliente_id", nullable = false)
    private Long clienteId;

    // "2026-10"
    @Column(nullable = false, length = 7)
    private String mes;

    // APROBADO | OBSERVADO
    @Column(nullable = false, length = 20)
    private String estado;

    @Column(columnDefinition = "TEXT")
    private String comentario;

    // Renglones que no reconoce: ids de ítems separados por coma
    @Column(columnDefinition = "TEXT")
    private String observados;

    @Column(name = "usuario_nombre", length = 120)
    private String usuarioNombre;

    @Column(name = "actualizado_en", nullable = false)
    private LocalDateTime actualizadoEn = LocalDateTime.now();

    public Long getId() { return id; }
    public Long getClienteId() { return clienteId; }
    public void setClienteId(Long v) { this.clienteId = v; }
    public String getMes() { return mes; }
    public void setMes(String v) { this.mes = v; }
    public String getEstado() { return estado; }
    public void setEstado(String v) { this.estado = v; }
    public String getComentario() { return comentario; }
    public void setComentario(String v) { this.comentario = v; }
    public String getObservados() { return observados; }
    public void setObservados(String v) { this.observados = v; }
    public String getUsuarioNombre() { return usuarioNombre; }
    public void setUsuarioNombre(String v) { this.usuarioNombre = v; }
    public LocalDateTime getActualizadoEn() { return actualizadoEn; }
    public void setActualizadoEn(LocalDateTime v) { this.actualizadoEn = v; }
}
