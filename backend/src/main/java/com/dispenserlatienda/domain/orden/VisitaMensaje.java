package com.dispenserlatienda.domain.orden;

import jakarta.persistence.*;
import java.time.LocalDateTime;

// Conversación admin ↔ técnico dentro de cada visita (8-oct-2026). Queda guardada con
// fecha y hora junto al trabajo: los mensajes escritos y los avisos automáticos
// (confirmó, en camino, no puede ir, reprogramada…) en un solo historial.
@Entity
@Table(name = "visita_mensaje", indexes = {
    @Index(name = "idx_visita_mensaje_orden", columnList = "orden_id")
})
public class VisitaMensaje {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "orden_id", nullable = false)
    private Long ordenId;

    @Column(name = "autor_id")
    private Long autorId;

    @Column(name = "autor_nombre", length = 120)
    private String autorNombre;

    // true = lo escribió el admin; false = el técnico
    @Column(name = "de_admin", nullable = false)
    private boolean deAdmin;

    // true = aviso automático del sistema (no lo tipeó nadie)
    @Column(nullable = false)
    private boolean sistema;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String texto;

    @Column(name = "creado_en", nullable = false)
    private LocalDateTime creadoEn = LocalDateTime.now();

    public Long getId() { return id; }
    public Long getOrdenId() { return ordenId; }
    public void setOrdenId(Long v) { this.ordenId = v; }
    public Long getAutorId() { return autorId; }
    public void setAutorId(Long v) { this.autorId = v; }
    public String getAutorNombre() { return autorNombre; }
    public void setAutorNombre(String v) { this.autorNombre = v; }
    public boolean isDeAdmin() { return deAdmin; }
    public void setDeAdmin(boolean v) { this.deAdmin = v; }
    public boolean isSistema() { return sistema; }
    public void setSistema(boolean v) { this.sistema = v; }
    public String getTexto() { return texto; }
    public void setTexto(String v) { this.texto = v; }
    public LocalDateTime getCreadoEn() { return creadoEn; }
}
