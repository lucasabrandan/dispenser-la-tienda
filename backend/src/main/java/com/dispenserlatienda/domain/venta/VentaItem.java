package com.dispenserlatienda.domain.venta;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * Entidad VentaItem - Representa un item individual en una venta.
 *
 * Responsabilidades:
 * - Almacenar información de un producto vendido
 * - Guardar cantidad y precios
 * - Calcular ganancias automáticamente
 *
 * Estructura:
 * Una Venta puede tener múltiples VentaItems (relación 1:N).
 * Cada item es un renglón en la tabla de venta.
 *
 * Ejemplo:
 * Venta ID 1:
 *   - Item 1: "Compresor aire" × 2 @ $500 = $1000
 *   - Item 2: "Refrigerante R134A" × 1 @ $200 = $200
 *   - Total venta: $1200
 *
 * Precios (por unidad):
 * - costoUnitario: Lo que pagó el negocio
 * - precioListaUnitario: Precio de lista (sin descuentos)
 * - precioAplicadoUnitario: Precio final cobrado al cliente
 *
 * Ganancias (se calculan automáticamente):
 * - gananciaUnitaria = precioAplicado - costo
 * - subtotalCosto = cantidad × costo
 * - subtotalVenta = cantidad × precioAplicado
 * - gananciaTotalItem = cantidad × gananciaUnitaria
 *
 * IMPORTANTE: Los cálculos se hacen automáticamente en calcularGanancias().
 * Se llama cada vez que cambia cantidad, costo o precio.
 *
 * @author Dispenser La Tienda
 * @version 1.0.0
 */
@Entity
@Table(name = "venta_items", indexes = {
        @Index(name = "idx_venta_items_venta_id", columnList = "venta_id")
})
public class VentaItem {

    // ============ ID ============

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // ============ RELACIÓN CON VENTA ============

    /**
     * Venta a la que pertenece este item.
     * IMPORTANTE: Al eliminar la venta, se eliminan todos sus items automáticamente.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "venta_id", nullable = false)
    private Venta venta;

    // ============ INFORMACIÓN DEL PRODUCTO ============

    /**
     * Descripción del producto vendido.
     * Ejemplo: "Compresor de aire 220V", "Refrigerante R134A"
     */
    @Column(name = "descripcion", length = 255, nullable = false)
    private String descripcion;

    /**
     * Cantidad vendida.
     * Validación: Debe ser mayor a 0.
     */
    @Column(nullable = false)
    private Integer cantidad;

    // ============ PRECIOS (Por unidad) ============

    /**
     * Costo unitario del producto para el negocio.
     * Lo que se pagó para obtenerlo.
     */
    @Column(name = "costo_unitario", nullable = false, precision = 10, scale = 2)
    private BigDecimal costoUnitario;

    /**
     * Precio de lista unitario (sin descuentos).
     * Se usa como referencia pero no necesariamente es el precio cobrado.
     */
    @Column(name = "precio_lista_unitario", nullable = false, precision = 10, scale = 2)
    private BigDecimal precioListaUnitario;

    /**
     * Precio unitario APLICADO (el que realmente cobró).
     * Puede ser diferente al precio de lista por promociones, descuentos, etc.
     */
    @Column(name = "precio_aplicado_unitario", nullable = false, precision = 10, scale = 2)
    private BigDecimal precioAplicadoUnitario;

    // ============ GANANCIAS (Se calculan automáticamente) ============

    /**
     * Ganancia unitaria.
     * Calculado: precioAplicado - costo
     * Ejemplo: Si cuesta $100 y se vende a $150, ganancia = $50
     */
    @Column(name = "ganancia_unitaria", nullable = false, precision = 10, scale = 2)
    private BigDecimal gananciaUnitaria = BigDecimal.ZERO;

    /**
     * Costo total de este item en la venta.
     * Calculado: cantidad × costoUnitario
     */
    @Column(name = "subtotal_costo", nullable = false, precision = 10, scale = 2)
    private BigDecimal subtotalCosto = BigDecimal.ZERO;

    /**
     * Total vendido de este item (antes de descuentos e IVA de la venta).
     * Calculado: cantidad × precioAplicado
     */
    @Column(name = "subtotal_venta", nullable = false, precision = 10, scale = 2)
    private BigDecimal subtotalVenta = BigDecimal.ZERO;

    /**
     * Ganancia total en este item.
     * Calculado: cantidad × gananciaUnitaria
     * Ejemplo: 2 unidades × $50 ganancia = $100 ganancia total en item
     */
    @Column(name = "ganancia_total_item", nullable = false, precision = 10, scale = 2)
    private BigDecimal gananciaTotalItem = BigDecimal.ZERO;

    // ============ CONSTRUCTORES ============

    public VentaItem() {
    }

    /**
     * Constructor completo.
     * Automáticamente calcula ganancias.
     */
    public VentaItem(String descripcion, Integer cantidad, BigDecimal costoUnitario,
                     BigDecimal precioListaUnitario, BigDecimal precioAplicadoUnitario) {
        this.descripcion = descripcion;
        this.cantidad = cantidad;
        this.costoUnitario = costoUnitario;
        this.precioListaUnitario = precioListaUnitario;
        this.precioAplicadoUnitario = precioAplicadoUnitario;
        calcularGanancias();
    }

    // ============ MÉTODOS DE CÁLCULO ============

    /**
     * Recalcula automáticamente todas las ganancias y subtotales.
     *
     * Se llama:
     * - En constructor
     * - Cuando cambia cantidad
     * - Cuando cambia costo
     * - Cuando cambia precio aplicado
     *
     * Fórmulas:
     * 1. Ganancia unitaria = precioAplicado - costo
     * 2. Subtotal costo = cantidad × costo
     * 3. Subtotal venta = cantidad × precioAplicado
     * 4. Ganancia total = cantidad × ganancia unitaria
     */
    public void calcularGanancias() {
        // Ganancia que obtiene por cada unidad vendida
        this.gananciaUnitaria = this.precioAplicadoUnitario.subtract(this.costoUnitario)
                .setScale(2, RoundingMode.HALF_UP);

        // Costo total invertido en este item
        this.subtotalCosto = this.costoUnitario.multiply(BigDecimal.valueOf(this.cantidad))
                .setScale(2, RoundingMode.HALF_UP);

        // Total ingresos por este item (antes de descuentos)
        this.subtotalVenta = this.precioAplicadoUnitario.multiply(BigDecimal.valueOf(this.cantidad))
                .setScale(2, RoundingMode.HALF_UP);

        // Ganancia total por este item
        this.gananciaTotalItem = this.gananciaUnitaria.multiply(BigDecimal.valueOf(this.cantidad))
                .setScale(2, RoundingMode.HALF_UP);
    }

    // ============ GETTERS & SETTERS ============

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Venta getVenta() {
        return venta;
    }

    public void setVenta(Venta venta) {
        this.venta = venta;
    }

    public String getDescripcion() {
        return descripcion;
    }

    public void setDescripcion(String descripcion) {
        this.descripcion = descripcion;
    }

    public Integer getCantidad() {
        return cantidad;
    }

    /**
     * Setter para cantidad - recalcula ganancias automáticamente.
     */
    public void setCantidad(Integer cantidad) {
        this.cantidad = cantidad;
        calcularGanancias();
    }

    public BigDecimal getCostoUnitario() {
        return costoUnitario;
    }

    /**
     * Setter para costo - recalcula ganancias automáticamente.
     */
    public void setCostoUnitario(BigDecimal costoUnitario) {
        this.costoUnitario = costoUnitario;
        calcularGanancias();
    }

    public BigDecimal getPrecioListaUnitario() {
        return precioListaUnitario;
    }

    public void setPrecioListaUnitario(BigDecimal precioListaUnitario) {
        this.precioListaUnitario = precioListaUnitario;
    }

    public BigDecimal getPrecioAplicadoUnitario() {
        return precioAplicadoUnitario;
    }

    /**
     * Setter para precio aplicado - recalcula ganancias automáticamente.
     */
    public void setPrecioAplicadoUnitario(BigDecimal precioAplicadoUnitario) {
        this.precioAplicadoUnitario = precioAplicadoUnitario;
        calcularGanancias();
    }

    public BigDecimal getGananciaUnitaria() {
        return gananciaUnitaria;
    }

    public void setGananciaUnitaria(BigDecimal gananciaUnitaria) {
        this.gananciaUnitaria = gananciaUnitaria;
    }

    public BigDecimal getSubtotalCosto() {
        return subtotalCosto;
    }

    public void setSubtotalCosto(BigDecimal subtotalCosto) {
        this.subtotalCosto = subtotalCosto;
    }

    public BigDecimal getSubtotalVenta() {
        return subtotalVenta;
    }

    public void setSubtotalVenta(BigDecimal subtotalVenta) {
        this.subtotalVenta = subtotalVenta;
    }

    public BigDecimal getGananciaTotalItem() {
        return gananciaTotalItem;
    }

    public void setGananciaTotalItem(BigDecimal gananciaTotalItem) {
        this.gananciaTotalItem = gananciaTotalItem;
    }

    // ============ MÉTODOS HELPER ============

    /**
     * Retorna margen de ganancia en porcentaje.
     * Ejemplo: Si cuesta $100 y se vende a $150, margen = 50%
     */
    public BigDecimal getMargenPorcentaje() {
        if (costoUnitario.compareTo(BigDecimal.ZERO) == 0) {
            return BigDecimal.ZERO;
        }
        return gananciaUnitaria.divide(costoUnitario, 4, RoundingMode.HALF_UP)
                .multiply(BigDecimal.valueOf(100));
    }

    @Override
    public String toString() {
        return "VentaItem{" +
                "id=" + id +
                ", descripcion='" + descripcion + '\'' +
                ", cantidad=" + cantidad +
                ", costoUnitario=" + costoUnitario +
                ", precioAplicadoUnitario=" + precioAplicadoUnitario +
                ", gananciaUnitaria=" + gananciaUnitaria +
                ", subtotalVenta=" + subtotalVenta +
                ", gananciaTotalItem=" + gananciaTotalItem +
                '}';
    }
}