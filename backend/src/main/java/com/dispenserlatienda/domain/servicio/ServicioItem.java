package com.dispenserlatienda.domain.servicio;

import com.dispenserlatienda.domain.equipo.Equipo;
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

    @Column(length = 100)
    private String tecnico;
    private BigDecimal costo;

    @Column(name = "costo_extra")
    private BigDecimal costoExtra;

    @Column(name = "costo_interno")
    private BigDecimal costoInterno;

    private BigDecimal descuento;

    // CAMBIO: De String a MetodoPago enum
    // Ahora solo pueden ser: EFECTIVO, TARJETA, TRANSFERENCIA, CHEQUE
    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private MetodoPago metodoPago;

    @Column(name = "trabajo_realizado", columnDefinition = "TEXT")
    private String trabajoRealizado;
    private LocalDate garantiaHasta;

    @Column(name = "repuestos_json", columnDefinition = "TEXT")
    private String repuestosUsados;

    @Column(name = "foto_antes", columnDefinition = "TEXT")
    private String fotoAntes;

    @Column(name = "foto_despues", columnDefinition = "TEXT")
    private String fotoDespues;

    public ServicioItem() {}

    public ServicioItem(Equipo equipo, String tecnico, BigDecimal costo, BigDecimal costoInterno,
                        BigDecimal descuento, MetodoPago metodoPago, String trabajoRealizado, LocalDate garantiaHasta) {
        this.equipo = equipo;
        this.tecnico = tecnico;
        this.costo = costo;
        this.costoExtra = BigDecimal.ZERO;
        this.costoInterno = (costoInterno != null) ? costoInterno : BigDecimal.ZERO;
        this.descuento = (descuento != null) ? descuento : BigDecimal.ZERO;
        this.metodoPago = metodoPago;
        this.trabajoRealizado = trabajoRealizado;
        this.garantiaHasta = garantiaHasta;
    }

    // --- Getters y Setters ---
    public Long getId() { return id; }
    public void setServicio(Servicio servicio) { this.servicio = servicio; }
    public Equipo getEquipo() { return equipo; }
    public void setEquipo(Equipo equipo) { this.equipo = equipo; }
    public String getTecnico() { return tecnico; }
    public void setTecnico(String tecnico) { this.tecnico = tecnico; }
    public BigDecimal getCosto() { return costo; }
    public void setCosto(BigDecimal costo) { this.costo = costo; }

    public BigDecimal getCostoExtra() { return costoExtra; }
    public void setCostoExtra(BigDecimal costoExtra) { this.costoExtra = costoExtra; }

    public BigDecimal getCostoInterno() { return costoInterno; }
    public void setCostoInterno(BigDecimal costoInterno) { this.costoInterno = costoInterno; }
    public BigDecimal getDescuento() { return descuento; }
    public void setDescuento(BigDecimal descuento) { this.descuento = descuento; }

    // CAMBIO: getter y setter ahora usan MetodoPago en lugar de String
    public MetodoPago getMetodoPago() { return metodoPago; }
    public void setMetodoPago(MetodoPago metodoPago) { this.metodoPago = metodoPago; }

    public String getTrabajoRealizado() { return trabajoRealizado; }
    public void setTrabajoRealizado(String trabajoRealizado) { this.trabajoRealizado = trabajoRealizado; }
    public LocalDate getGarantiaHasta() { return garantiaHasta; }
    public void setGarantiaHasta(LocalDate garantiaHasta) { this.garantiaHasta = garantiaHasta; }

    public String getRepuestosUsados() { return repuestosUsados; }
    public void setRepuestosUsados(String repuestosUsados) { this.repuestosUsados = repuestosUsados; }

    public String getFotoAntes() { return fotoAntes; }
    public void setFotoAntes(String fotoAntes) { this.fotoAntes = fotoAntes; }
    public String getFotoDespues() { return fotoDespues; }
    public void setFotoDespues(String fotoDespues) { this.fotoDespues = fotoDespues; }
}