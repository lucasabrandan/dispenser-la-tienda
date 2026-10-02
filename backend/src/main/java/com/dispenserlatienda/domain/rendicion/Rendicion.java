package com.dispenserlatienda.domain.rendicion;

import com.dispenserlatienda.domain.usuario.Usuario;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Rendición diaria de efectivo del técnico (2-oct-2026). La genera "Cerrar mi día":
 * cuánto cobró en efectivo ese día (lo que tiene que entregar) + el resumen en texto.
 * El admin la marca como recibida desde el Panel. Una por técnico y por día
 * (si vuelve a cerrar el mismo día, se pisa mientras no esté recibida).
 */
@Entity
@Table(name = "rendicion", uniqueConstraints = @UniqueConstraint(columnNames = {"tecnico_id", "fecha"}))
public class Rendicion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "tecnico_id")
    private Usuario tecnico;

    @Column(nullable = false)
    private LocalDate fecha;

    @Column(nullable = false)
    private BigDecimal monto = BigDecimal.ZERO;

    @Column(columnDefinition = "TEXT")
    private String detalle;

    @Column(columnDefinition = "TEXT")
    private String nota;

    @Column(name = "creado_en", nullable = false)
    private LocalDateTime creadoEn = LocalDateTime.now();

    @Column(nullable = false)
    private boolean recibido = false;

    @Column(name = "recibido_en")
    private LocalDateTime recibidoEn;

    protected Rendicion() {}

    public Rendicion(Usuario tecnico, LocalDate fecha) {
        this.tecnico = tecnico;
        this.fecha = fecha;
    }

    public Long getId() { return id; }
    public Usuario getTecnico() { return tecnico; }
    public LocalDate getFecha() { return fecha; }
    public BigDecimal getMonto() { return monto; }
    public void setMonto(BigDecimal monto) { this.monto = monto; }
    public String getDetalle() { return detalle; }
    public void setDetalle(String detalle) { this.detalle = detalle; }
    public String getNota() { return nota; }
    public void setNota(String nota) { this.nota = nota; }
    public LocalDateTime getCreadoEn() { return creadoEn; }
    public void setCreadoEn(LocalDateTime creadoEn) { this.creadoEn = creadoEn; }
    public boolean isRecibido() { return recibido; }
    public void setRecibido(boolean recibido) { this.recibido = recibido; }
    public LocalDateTime getRecibidoEn() { return recibidoEn; }
    public void setRecibidoEn(LocalDateTime recibidoEn) { this.recibidoEn = recibidoEn; }
}
