package com.dispenserlatienda.domain.servicio;

import com.dispenserlatienda.domain.Sede;
import com.dispenserlatienda.domain.usuario.Usuario;
import jakarta.persistence.*;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

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
    private ServicioTipo servicioTipo; // Unificamos el nombre a servicioTipo

    @Column(length = 1000)
    private String observaciones;

    @OneToMany(mappedBy = "servicio", cascade = CascadeType.ALL, orphanRemoval = true)
    private final List<ServicioItem> items = new ArrayList<>();

    protected Servicio() {}

    public Servicio(Sede sede, Usuario usuario, LocalDate fechaServicio, ServicioTipo servicioTipo) {
        if (sede == null) throw new IllegalArgumentException("sede es obligatoria");
        if (usuario == null) throw new IllegalArgumentException("usuario es obligatorio");
        if (fechaServicio == null) throw new IllegalArgumentException("fechaServicio es obligatoria");
        if (servicioTipo == null) throw new IllegalArgumentException("tipo de servicio es obligatorio");

        this.sede = sede;
        this.usuario = usuario;
        this.fechaServicio = fechaServicio;
        this.servicioTipo = servicioTipo;
    }

    // ✅ Helper para sincronización bidireccional
    public void addItem(ServicioItem item) {
        if (item == null) throw new IllegalArgumentException("item no puede ser null");
        if (this.items.contains(item)) return;

        this.items.add(item);
        item.setServicio(this);
    }

    public void removeItem(ServicioItem item) {
        if (item == null) return;
        if (this.items.remove(item)) {
            item.setServicio(null);
        }
    }

    // --- GETTERS ---
    public Long getId() { return id; }
    public Sede getSede() { return sede; }
    public Usuario getUsuario() { return usuario; }
    public LocalDate getFechaServicio() { return fechaServicio; }
    public ServicioTipo getServicioTipo() { return servicioTipo; } // Coincide con el Service
    public String getObservaciones() { return observaciones; }

    public List<ServicioItem> getItems() {
        return Collections.unmodifiableList(items);
    }

    // --- SETTERS ---
    public void setObservaciones(String observaciones) {
        this.observaciones = observaciones;
    }
}