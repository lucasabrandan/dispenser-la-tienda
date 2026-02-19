package com.dispenserlatienda.domain.servicio;

import com.dispenserlatienda.domain.Equipo;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "servicio_items")
public class ServicioItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "servicio_id")
    private Servicio servicio;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "equipo_id")
    private Equipo equipo;

    private String tecnico;
    private BigDecimal costo;
    private BigDecimal descuento;
    private String metodoPago;
    private String trabajoRealizado;
    private LocalDate garantiaHasta;

    public ServicioItem() {}

    public ServicioItem(Equipo equipo, String tecnico, BigDecimal costo, BigDecimal descuento, String metodoPago, String trabajoRealizado, LocalDate garantiaHasta) {
        this.equipo = equipo;
        this.tecnico = tecnico;
        this.costo = costo;
        this.descuento = (descuento != null) ? descuento : BigDecimal.ZERO;
        this.metodoPago = (metodoPago != null) ? metodoPago : "EFECTIVO";
        this.trabajoRealizado = trabajoRealizado;
        this.garantiaHasta = garantiaHasta;
    }

    public Long getId() { return id; }
    public void setServicio(Servicio servicio) { this.servicio = servicio; }
    public Equipo getEquipo() { return equipo; }
    public String getTecnico() { return tecnico; }
    public BigDecimal getCosto() { return costo; }
    public BigDecimal getDescuento() { return descuento; }
    public String getMetodoPago() { return metodoPago; }
    public String getTrabajoRealizado() { return trabajoRealizado; }
    public LocalDate getGarantiaHasta() { return garantiaHasta; }
}