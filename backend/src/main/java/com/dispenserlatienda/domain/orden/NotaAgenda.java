package com.dispenserlatienda.domain.orden;

import com.dispenserlatienda.domain.usuario.Usuario;
import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Nota personal del tecnico en su agenda.
 * No crea clientes ni servicios reales — es solo para organizacion interna.
 */
@Entity
@Table(name = "nota_agenda")
public class NotaAgenda {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "tecnico_id", nullable = false)
    private Usuario tecnico;

    @Column(nullable = false)
    private LocalDate fecha;

    @Column(name = "hora_estimada", length = 10)
    private String horaEstimada;

    @Column(nullable = false, length = 200)
    private String titulo;

    @Column(length = 1000)
    private String descripcion;

    @Column(length = 300)
    private String direccion;

    @Column(nullable = false)
    private boolean completada = false;

    @Column(name = "creado_en", nullable = false, updatable = false)
    private LocalDateTime creadoEn;

    @PrePersist
    protected void onCreate() {
        this.creadoEn = LocalDateTime.now();
    }

    public NotaAgenda() {}

    // Getters / Setters
    public Long getId() { return id; }

    public Usuario getTecnico() { return tecnico; }
    public void setTecnico(Usuario tecnico) { this.tecnico = tecnico; }

    public LocalDate getFecha() { return fecha; }
    public void setFecha(LocalDate fecha) { this.fecha = fecha; }

    public String getHoraEstimada() { return horaEstimada; }
    public void setHoraEstimada(String horaEstimada) { this.horaEstimada = horaEstimada; }

    public String getTitulo() { return titulo; }
    public void setTitulo(String titulo) { this.titulo = titulo; }

    public String getDescripcion() { return descripcion; }
    public void setDescripcion(String descripcion) { this.descripcion = descripcion; }

    public String getDireccion() { return direccion; }
    public void setDireccion(String direccion) { this.direccion = direccion; }

    public boolean isCompletada() { return completada; }
    public void setCompletada(boolean completada) { this.completada = completada; }

    public LocalDateTime getCreadoEn() { return creadoEn; }
}
