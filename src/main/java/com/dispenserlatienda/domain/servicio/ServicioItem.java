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

    // ❗ ahora el setter se usa para sincronizar el agregado
    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "servicio_id", nullable = false)
    private Servicio servicio;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "equipo_id", nullable = false)
    private Equipo equipo;

    @Enumerated(EnumType.STRING)
    @Column(name = "trabajo_tipo", nullable = false, length = 30)
    private TrabajoTipo trabajoTipo;

    @Column(name = "trabajo_realizado", nullable = false, length = 1000)
    private String trabajoRealizado;

    @Column(name = "garantia_hasta")
    private LocalDate garantiaHasta;

    protected ServicioItem() {}

    // ✅ Cambiamos el constructor: NO recibe Servicio.
    // Motivo: el padre (Servicio) es el que “adopta” al item con addItem()
    public ServicioItem(Equipo equipo, TrabajoTipo trabajoTipo, String trabajoRealizado) {
        if (equipo == null) throw new IllegalArgumentException("equipo es obligatorio");
        if (trabajoTipo == null) throw new IllegalArgumentException("trabajoTipo es obligatorio");
        if (trabajoRealizado == null || trabajoRealizado.isBlank()) {
            throw new IllegalArgumentException("trabajoRealizado es obligatorio");
        }

        this.equipo = equipo;
        this.trabajoTipo = trabajoTipo;
        this.trabajoRealizado = trabajoRealizado;
    }

    public Long getId() { return id; }
    public Servicio getServicio() { return servicio; }
    public Equipo getEquipo() { return equipo; }
    public TrabajoTipo getTrabajoTipo() { return trabajoTipo; }
    public String getTrabajoRealizado() { return trabajoRealizado; }
    public LocalDate getGarantiaHasta() { return garantiaHasta; }

    public void setGarantiaHasta(LocalDate garantiaHasta) {
        this.garantiaHasta = garantiaHasta;
        validarGarantia();
    }

    // 🔒 Setter “de paquete” o public para JPA + helpers
    // (si querés lo hacemos package-private, pero IntelliJ a veces complica)
    public void setServicio(Servicio servicio) {
        this.servicio = servicio;
    }

    private void validarGarantia() {
        if (trabajoTipo == TrabajoTipo.REVISION) {
            if (garantiaHasta != null) {
                throw new IllegalStateException("REVISION no debe tener garantía");
            }
        } else {
            if (garantiaHasta == null) {
                throw new IllegalStateException(trabajoTipo + " debe tener garantía");
            }
        }
    }
}
