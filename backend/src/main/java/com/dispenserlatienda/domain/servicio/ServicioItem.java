package com.dispenserlatienda.domain.servicio;

import com.dispenserlatienda.domain.Equipo;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "servicio_item")
public class ServicioItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "servicio_id")
    @JsonIgnore
    private Servicio servicio;

    @ManyToOne(optional = false)
    @JoinColumn(name = "equipo_id", nullable = false)
    @JsonIgnoreProperties({"equipos", "sede"})
    private Equipo equipo;

    private String tecnico;
    private BigDecimal costo;
    private LocalDateTime fechaHora;

    // 🛠️ Cambiamos el nombre para que coincida con el Service
    @Column(name = "trabajo_realizado", length = 1000)
    private String trabajoRealizado;

    @Column(name = "garantia_hasta")
    private LocalDate garantiaHasta;

    @Enumerated(EnumType.STRING)
    private TrabajoTipo trabajoTipo;

    protected ServicioItem() {}

    // Constructor para el nuevo formulario
    public ServicioItem(Equipo equipo, String tecnico, BigDecimal costo, String trabajoRealizado, LocalDate garantiaHasta) {
        this.equipo = equipo;
        this.tecnico = tecnico;
        this.costo = costo;
        this.trabajoRealizado = trabajoRealizado;
        this.garantiaHasta = garantiaHasta;
        this.fechaHora = LocalDateTime.now();
        this.trabajoTipo = TrabajoTipo.REPARACION; // Valor por defecto para no romper el modelo
    }

    public void setServicio(Servicio servicio) {
        this.servicio = servicio;
    }

    // --- Getters que el Service necesita ---
    public Long getId() { return id; }
    public Equipo getEquipo() { return equipo; }
    public String getTecnico() { return tecnico; }
    public BigDecimal getCosto() { return costo; }
    public String getTrabajoRealizado() { return trabajoRealizado; } // 👈 EL QUE FALTABA
    public LocalDate getGarantiaHasta() { return garantiaHasta; }
    public LocalDateTime getFechaHora() { return fechaHora; }
    public TrabajoTipo getTrabajoTipo() { return trabajoTipo; }
}