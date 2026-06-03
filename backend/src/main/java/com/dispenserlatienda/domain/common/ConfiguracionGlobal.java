package com.dispenserlatienda.domain.common;

import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "configuracion_global")
public class ConfiguracionGlobal {
    @Id
    private Long id = 1L;

    // Precio base de mano de obra por máquina CON IVA ($72.600)
    @Column(name = "mano_de_obra_base", nullable = false)
    private BigDecimal manoDeObraBase = new BigDecimal("72600");

    // Porcentaje de impuestos para reparación facturada (30% → $78.000)
    @Column(name = "porcentaje_impuestos", nullable = false)
    private Integer porcentajeImpuestos = 30;

    // Descuento por pago efectivo sin factura (10% → $70.200)
    @Column(name = "descuento_efectivo", nullable = false)
    private Integer descuentoEfectivo = 10;

    // IVA para visitas facturadas (21%)
    @Column(name = "porcentaje_iva", nullable = false)
    private Integer porcentajeIVA = 21;

    public ConfiguracionGlobal() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public BigDecimal getManoDeObraBase() { return manoDeObraBase; }
    public void setManoDeObraBase(BigDecimal manoDeObraBase) { this.manoDeObraBase = manoDeObraBase; }

    public Integer getPorcentajeImpuestos() { return porcentajeImpuestos; }
    public void setPorcentajeImpuestos(Integer porcentajeImpuestos) { this.porcentajeImpuestos = porcentajeImpuestos; }

    public Integer getDescuentoEfectivo() { return descuentoEfectivo; }
    public void setDescuentoEfectivo(Integer descuentoEfectivo) { this.descuentoEfectivo = descuentoEfectivo; }

    public Integer getPorcentajeIVA() { return porcentajeIVA; }
    public void setPorcentajeIVA(Integer porcentajeIVA) { this.porcentajeIVA = porcentajeIVA; }
}
