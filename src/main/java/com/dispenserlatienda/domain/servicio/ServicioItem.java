package com.dispenserlatienda.domain.servicio;

import com.dispenserlatienda.domain.Equipo;
import jakarta.persistence.*;

import java.time.LocalDate;

@Entity
@Table(name = "servicio_item")
public class ServicioItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "servicio_id", nullable = false)
    private Servicio servicio;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "equipo_id", nullable = false)
    private Equipo equipo;

    @Enumerated(EnumType.STRING)
    @Column(name = "trabajo_tipo", nullable = false, length = 30)
    private TrabajoTipo trabajoTipo;

    @Column(name = "trabajo_realizado", length = 1000)
    private String trabajoRealizado;

    @Column(name = "garantia_hasta")
    private LocalDate garantiaHasta;

    protected ServicioItem() {}

    public ServicioItem(Servicio servicio, Equipo equipo, TrabajoTipo trabajoTipo, String trabajoRealizado) {
        this.servicio = servicio;
        this.equipo = equipo;
        this.trabajoTipo = trabajoTipo;
        this.trabajoRealizado = trabajoRealizado;
    }

    public Long getId() { return id; }
    public Servicio getServicio() { return servicio; }
    public Equipo getEquipo() { return equipo; }
    public LocalDate getGarantiaHasta() { return garantiaHasta; }

    public void setGarantiaHasta(LocalDate garantiaHasta) { this.garantiaHasta = garantiaHasta; }
}
