package com.dispenserlatienda.domain.liquidacion;

import com.dispenserlatienda.domain.usuario.Usuario;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

// Plata que se movió entre DLT y el técnico/socio para saldar un mes (5-oct-2026).
// PAGO    = DLT le pagó al técnico (su parte).
// ENTREGA = el técnico le entregó a DLT efectivo cobrado (aparte de las rendiciones).
@Entity
@Table(name = "movimiento_socio")
public class MovimientoSocio {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "tecnico_id", nullable = false)
    private Usuario tecnico;

    @Column(nullable = false, length = 7)
    private String mes; // "YYYY-MM"

    @Column(nullable = false, length = 10)
    private String tipo; // PAGO | ENTREGA

    @Column(nullable = false)
    private BigDecimal monto;

    @Column(nullable = false)
    private LocalDate fecha = LocalDate.now();

    @Column(length = 200)
    private String nota;

    @Column(name = "creado_en", nullable = false)
    private LocalDateTime creadoEn = LocalDateTime.now();

    public Long getId() { return id; }
    public Usuario getTecnico() { return tecnico; }
    public void setTecnico(Usuario tecnico) { this.tecnico = tecnico; }
    public String getMes() { return mes; }
    public void setMes(String mes) { this.mes = mes; }
    public String getTipo() { return tipo; }
    public void setTipo(String tipo) { this.tipo = tipo; }
    public BigDecimal getMonto() { return monto; }
    public void setMonto(BigDecimal monto) { this.monto = monto; }
    public LocalDate getFecha() { return fecha; }
    public void setFecha(LocalDate fecha) { this.fecha = fecha; }
    public String getNota() { return nota; }
    public void setNota(String nota) { this.nota = nota; }
}
