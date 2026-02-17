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
    private ServicioTipo tipo;

    @Column(length = 1000)
    private String observaciones;

    // ✅ Relación agregada: Servicio (padre) -> ServicioItem (hijos)
    // - cascade ALL: si guardo Servicio, se guardan sus items
    // - orphanRemoval true: si saco un item de la lista, se borra (en DB) porque no tiene sentido “huérfano”
    @OneToMany(mappedBy = "servicio", cascade = CascadeType.ALL, orphanRemoval = true)
    private final List<ServicioItem> items = new ArrayList<>();

    protected Servicio() {}

    public Servicio(Sede sede, Usuario usuario, LocalDate fechaServicio, ServicioTipo tipo) {
        if (sede == null) throw new IllegalArgumentException("sede es obligatoria");
        if (usuario == null) throw new IllegalArgumentException("usuario es obligatorio");
        if (fechaServicio == null) throw new IllegalArgumentException("fechaServicio es obligatoria");
        if (tipo == null) throw new IllegalArgumentException("tipo de servicio es obligatorio");

        this.sede = sede;
        this.usuario = usuario;
        this.fechaServicio = fechaServicio;
        this.tipo = tipo;
    }

    // ✅ Helper para sincronización bidireccional
    public void addItem(ServicioItem item) {
        if (item == null) throw new IllegalArgumentException("item no puede ser null");

        // si ya pertenece a este servicio, no repetimos
        if (this.items.contains(item)) return;

        this.items.add(item);
        item.setServicio(this); // sincroniza el lado ManyToOne
    }

    public void removeItem(ServicioItem item) {
        if (item == null) return;

        if (this.items.remove(item)) {
            item.setServicio(null); // deja huérfano en memoria; orphanRemoval lo borrará en DB al persistir
        }
    }

    // Exponemos lista como read-only (evita que desde afuera rompan el agregado)
    public List<ServicioItem> getItems() {
        return Collections.unmodifiableList(items);
    }

    public Long getId() { return id; }
    public Sede getSede() { return sede; }
    public Usuario getUsuario() { return usuario; }
    public LocalDate getFechaServicio() { return fechaServicio; }
    public ServicioTipo getTipo() { return tipo; }
    public String getObservaciones() { return observaciones; }

    public void setObservaciones(String observaciones) {
        this.observaciones = observaciones;
    }
}
