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

    // 💡 Lo que le cobraste al cliente (Precio Venta Final)
    private BigDecimal costo;

    // 💡 NUEVO: Lo que te costaron a vos los repuestos de este trabajo
    @Column(name = "costo_interno")
    private BigDecimal costoInterno;

    private BigDecimal descuento;
    private String metodoPago;
    private String trabajoRealizado;
    private LocalDate garantiaHasta;

    public ServicioItem() {}

    // Constructor actualizado
    public ServicioItem(Equipo equipo, String tecnico, BigDecimal costo, BigDecimal costoInterno, BigDecimal descuento, String metodoPago, String trabajoRealizado, LocalDate garantiaHasta) {
        this.equipo = equipo;
        this.tecnico = tecnico;
        this.costo = costo;
        this.costoInterno = (costoInterno != null) ? costoInterno : BigDecimal.ZERO;
        this.descuento = (descuento != null) ? descuento : BigDecimal.ZERO;
        this.metodoPago = (metodoPago != null) ? metodoPago : "EFECTIVO";
        this.trabajoRealizado = trabajoRealizado;
        this.garantiaHasta = garantiaHasta;
    }

    // --- GETTERS Y SETTERS ---
    public Long getId() { return id; }
    public void setServicio(Servicio servicio) { this.servicio = servicio; }
    public Equipo getEquipo() { return equipo; }
    public String getTecnico() { return tecnico; }

    public BigDecimal getCosto() { return costo; }
    public void setCosto(BigDecimal costo) { this.costo = costo; }

    public BigDecimal getCostoInterno() { return costoInterno; }
    public void setCostoInterno(BigDecimal costoInterno) { this.costoInterno = costoInterno; }

    public BigDecimal getDescuento() { return descuento; }
    public String getMetodoPago() { return metodoPago; }
    public String getTrabajoRealizado() { return trabajoRealizado; }
    public LocalDate getGarantiaHasta() { return garantiaHasta; }
}