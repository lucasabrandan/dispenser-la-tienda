package com.dispenserlatienda.domain.servicio;

import com.dispenserlatienda.domain.Sede;
import com.dispenserlatienda.domain.usuario.Usuario;
import jakarta.persistence.*;
import java.time.LocalDate;
import java.util.ArrayList;
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
    private ServicioTipo servicioTipo;

    @Column(nullable = false, length = 20)
    private String estado = "PRESUPUESTO"; // 🛡️ Por defecto presupuesto

    @Column(name = "cliente_nombre")
    private String clienteNombre;

    @Column(name = "sede_nombre")
    private String sedeNombre;

    @Column(length = 1000)
    private String observaciones;

    @Column(name = "foto_remito")
    private String fotoRemito;

    @OneToMany(mappedBy = "servicio", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<ServicioItem> items = new ArrayList<>();

    // 🛡️ FIX 1: Cambiado a PUBLIC.
    // Si es 'protected', el ServicioService no puede hacer "new Servicio()"
    public Servicio() {}

    public Servicio(Sede sede, Usuario usuario, LocalDate fechaServicio, ServicioTipo servicioTipo) {
        this.sede = sede;
        this.usuario = usuario;
        this.fechaServicio = fechaServicio;
        this.servicioTipo = servicioTipo;
    }

    public void addItem(ServicioItem item) {
        this.items.add(item);
        item.setServicio(this);
    }

    // --- Getters y Setters ---
    public Long getId() { return id; }

    // 🛡️ FIX 2: Agregados setters que el Service necesita para actualizar
    public void setSede(Sede sede) { this.sede = sede; }
    public Sede getSede() { return sede; }

    public void setUsuario(Usuario usuario) { this.usuario = usuario; }
    public Usuario getUsuario() { return usuario; }

    public String getEstado() { return estado; }
    public void setEstado(String estado) { this.estado = estado; }

    // 🛡️ FIX 3: Quitamos el 'Collections.unmodifiableList'.
    // El Service necesita hacer "servicio.getItems().clear()" para editar.
    public List<ServicioItem> getItems() { return items; }

    public LocalDate getFechaServicio() { return fechaServicio; }
    public void setFechaServicio(LocalDate fechaServicio) { this.fechaServicio = fechaServicio; }

    public ServicioTipo getServicioTipo() { return servicioTipo; }
    public void setServicioTipo(ServicioTipo servicioTipo) { this.servicioTipo = servicioTipo; }

    public String getClienteNombre() { return clienteNombre; }
    public void setClienteNombre(String clienteNombre) { this.clienteNombre = clienteNombre; }

    public String getSedeNombre() { return sedeNombre; }
    public void setSedeNombre(String sedeNombre) { this.sedeNombre = sedeNombre; }

    public String getFotoRemito() { return fotoRemito; }
    public void setFotoRemito(String fotoRemito) { this.fotoRemito = fotoRemito; }

    public String getObservaciones() { return observaciones; }
    public void setObservaciones(String observaciones) { this.observaciones = observaciones; }
}