package com.dispenserlatienda.domain.servicio;

import com.dispenserlatienda.domain.sede.Sede;
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

    // CAMBIO: De String a EstadoServicio enum
    // Ahora solo pueden ser: PRESUPUESTO, APROBADO, EN_PROGRESO, REALIZADO, RECHAZADO, CANCELADO
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private EstadoServicio estado = EstadoServicio.PRESUPUESTO;

    @Column(name = "cliente_nombre")
    private String clienteNombre;

    @Column(name = "sede_nombre")
    private String sedeNombre;

    @Column(length = 1000)
    private String observaciones;

    @Column(name = "foto_remito")
    private String fotoRemito;

    @Column(name = "descuento_porcentaje")
    private java.math.BigDecimal descuentoPorcentaje;

    @OneToMany(mappedBy = "servicio", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<ServicioItem> items = new ArrayList<>();

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

    public void setSede(Sede sede) { this.sede = sede; }
    public Sede getSede() { return sede; }

    public void setUsuario(Usuario usuario) { this.usuario = usuario; }
    public Usuario getUsuario() { return usuario; }

    // CAMBIO: getter y setter ahora usan EstadoServicio en lugar de String
    public EstadoServicio getEstado() { return estado; }
    public void setEstado(EstadoServicio estado) { this.estado = estado; }

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

    public java.math.BigDecimal getDescuentoPorcentaje() { return descuentoPorcentaje; }
    public void setDescuentoPorcentaje(java.math.BigDecimal descuentoPorcentaje) { this.descuentoPorcentaje = descuentoPorcentaje; }

    public String getObservaciones() { return observaciones; }
    public void setObservaciones(String observaciones) { this.observaciones = observaciones; }
}