package com.dispenserlatienda.domain.notificacion;

import com.dispenserlatienda.domain.usuario.Usuario;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "notificacion", indexes = {
    @Index(name = "idx_notif_destino_leida", columnList = "destino_id, leida"),
})
public class Notificacion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private TipoNotificacion tipo;

    @Column(nullable = false, length = 300)
    private String titulo;

    @Column(length = 1000)
    private String mensaje;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "destino_id", nullable = false)
    private Usuario destino;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "origen_id")
    private Usuario origen;

    @Column(name = "referencia_id")
    private Long referenciaId;

    @Column(nullable = false)
    private boolean leida = false;

    @Column(name = "creado_en", nullable = false, updatable = false)
    private LocalDateTime creadoEn;

    @PrePersist
    protected void onCreate() { this.creadoEn = LocalDateTime.now(); }

    public Notificacion() {}

    // Getters / Setters
    public Long getId() { return id; }
    public TipoNotificacion getTipo() { return tipo; }
    public void setTipo(TipoNotificacion tipo) { this.tipo = tipo; }
    public String getTitulo() { return titulo; }
    public void setTitulo(String titulo) { this.titulo = titulo; }
    public String getMensaje() { return mensaje; }
    public void setMensaje(String mensaje) { this.mensaje = mensaje; }
    public Usuario getDestino() { return destino; }
    public void setDestino(Usuario destino) { this.destino = destino; }
    public Usuario getOrigen() { return origen; }
    public void setOrigen(Usuario origen) { this.origen = origen; }
    public Long getReferenciaId() { return referenciaId; }
    public void setReferenciaId(Long referenciaId) { this.referenciaId = referenciaId; }
    public boolean isLeida() { return leida; }
    public void setLeida(boolean leida) { this.leida = leida; }
    public LocalDateTime getCreadoEn() { return creadoEn; }
}
