package com.dispenserlatienda.domain.servicio;

import com.dispenserlatienda.domain.Sede;
import com.dispenserlatienda.domain.usuario.Usuario;
import jakarta.persistence.*;

import java.time.LocalDate;

@Entity
@Table(name = "servicio")
public class Servicio {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "sede_id", nullable = false)
    private Sede sede;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;

    @Column(name = "fecha_servicio", nullable = false)
    private LocalDate fechaServicio;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ServicioTipo tipo;

    @Column(length = 1000)
    private String observaciones;

    protected Servicio() {}

    public Servicio(Sede sede, Usuario usuario, LocalDate fechaServicio, ServicioTipo tipo) {
        this.sede = sede;
        this.usuario = usuario;
        this.fechaServicio = fechaServicio;
        this.tipo = tipo;
    }

    public Long getId() { return id; }
    public Sede getSede() { return sede; }
    public Usuario getUsuario() { return usuario; }
    public LocalDate getFechaServicio() { return fechaServicio; }
    public ServicioTipo getTipo() { return tipo; }
}
