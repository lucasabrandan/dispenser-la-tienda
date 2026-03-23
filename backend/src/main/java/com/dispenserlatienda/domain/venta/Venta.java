package com.dispenserlatienda.domain.venta;

import com.dispenserlatienda.domain.common.BaseEntity;
import com.dispenserlatienda.domain.cliente.Cliente;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/**
 * Entidad Venta - Representa la venta de repuestos a un cliente.
 *
 * IMPORTANTE: Diferencia con Servicio:
 * - Venta: Solo repuestos, cliente obligatorio, equipo OPCIONAL
 * - Servicio: Repuestos + Mano de obra, cliente + equipo + sede obligatorios
 *
 * Responsabilidades:
 * - Almacenar información de venta
 * - Mantener relación con cliente
 * - Guardar items vendidos
 * - Registrar totales (costo, venta, ganancia)
 * - Auditoría automática (hereda de BaseEntity)
 *
 * Estados de una venta:
 * - CONFIRMADA: Venta registrada, pendiente de pago
 * - PAGADA: Venta completada y pagada
 * - CANCELADA: Venta anulada
 *
 * Cálculos importantes (ver VentaService):
 * - Subtotal: SUM(cantidad × precio_aplicado)
 * - Descuento: Subtotal × (descuentoPorcentaje / 100)
 * - IVA: (Subtotal - Descuento) × 0.21
 * - Total: Subtotal - Descuento + IVA
 * - Ganancia: Total - SUM(cantidad × costo)
 *
 * @author Dispenser La Tienda
 * @version 1.0.0
 */
@Entity
@Table(name = "venta", indexes = {
        @Index(name = "idx_venta_cliente", columnList = "cliente_id"),
        @Index(name = "idx_venta_fecha", columnList = "fecha"),
        @Index(name = "idx_venta_estado", columnList = "estado")
})
public class Venta extends BaseEntity {

    // ============ RELACIONES ============

    /**
     * Cliente que realiza la compra (obligatorio).
     * IMPORTANTE: La venta siempre debe tener un cliente.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cliente_id", nullable = false)
    private Cliente cliente;

    /**
     * Items vendidos (uno a muchos).
     * Cascade ALL + orphanRemoval: cuando se elimina una venta, se eliminan sus items.
     */
    @OneToMany(mappedBy = "venta", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private List<VentaItem> items = new ArrayList<>();

    // ============ CAMPOS DE INFORMACIÓN ============

    /**
     * Fecha de la venta.
     */
    @Column(nullable = false)
    private LocalDate fecha;

    /**
     * Observaciones o notas adicionales.
     */
    @Column(length = 500)
    private String observaciones;

    // ============ CAMPOS DE CÁLCULOS ============

    /**
     * Costo total de repuestos (sin IVA, sin ganancia).
     * Calculado: SUM(item.cantidad × item.costoUnitario)
     */
    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal subtotalCosto = BigDecimal.ZERO;

    /**
     * Subtotal de venta ANTES de descuento e IVA.
     * Calculado: SUM(item.cantidad × item.precioAplicado)
     */
    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal subtotalVenta = BigDecimal.ZERO;

    /**
     * Porcentaje de descuento a aplicar (0-100).
     */
    @Column(name = "descuento_porcentaje", precision = 5, scale = 2)
    private BigDecimal descuentoPorcentaje = BigDecimal.ZERO;

    /**
     * Monto en dinero que se descuenta.
     * Calculado: subtotalVenta × (descuentoPorcentaje / 100)
     */
    @Column(name = "descuento_monto", nullable = false, precision = 10, scale = 2)
    private BigDecimal descuentoMonto = BigDecimal.ZERO;

    /**
     * IVA calculado al 21%.
     * Calculado: (subtotalVenta - descuentoMonto) × 0.21
     */
    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal iva = BigDecimal.ZERO;

    /**
     * Total que ingresa al negocio (lo que el cliente paga).
     * Calculado: subtotalVenta - descuentoMonto + iva
     */
    @Column(name = "total_ingreso", nullable = false, precision = 10, scale = 2)
    private BigDecimal totalIngreso = BigDecimal.ZERO;

    /**
     * Ganancia real del negocio.
     * Calculado: totalIngreso - subtotalCosto
     */
    @Column(name = "ganancia_real", nullable = false, precision = 10, scale = 2)
    private BigDecimal gananciaReal = BigDecimal.ZERO;

    // ============ ESTADO ============

    /**
     * Estado actual de la venta.
     * Valores: CONFIRMADA, PAGADA, CANCELADA
     */
    @Column(length = 20)
    @Enumerated(EnumType.STRING)
    private EstadoVenta estado = EstadoVenta.CONFIRMADA;

    // ============ CONSTRUCTORES ============

    public Venta() {
        super();
        this.items = new ArrayList<>();
    }

    /**
     * Constructor con cliente y fecha.
     */
    public Venta(Cliente cliente, LocalDate fecha) {
        super();
        this.cliente = cliente;
        this.fecha = fecha;
        this.items = new ArrayList<>();
        this.estado = EstadoVenta.CONFIRMADA;
    }

    // ============ GETTERS & SETTERS ============

    public Cliente getCliente() {
        return cliente;
    }

    public void setCliente(Cliente cliente) {
        this.cliente = cliente;
    }

    public LocalDate getFecha() {
        return fecha;
    }

    public void setFecha(LocalDate fecha) {
        this.fecha = fecha;
    }

    public List<VentaItem> getItems() {
        return items;
    }

    public void setItems(List<VentaItem> items) {
        this.items = items;
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

    public BigDecimal getDescuentoPorcentaje() {
        return descuentoPorcentaje;
    }

    public void setDescuentoPorcentaje(BigDecimal descuentoPorcentaje) {
        this.descuentoPorcentaje = descuentoPorcentaje;
    }

    public BigDecimal getDescuentoMonto() {
        return descuentoMonto;
    }

    public void setDescuentoMonto(BigDecimal descuentoMonto) {
        this.descuentoMonto = descuentoMonto;
    }

    public BigDecimal getIva() {
        return iva;
    }

    public void setIva(BigDecimal iva) {
        this.iva = iva;
    }

    public BigDecimal getTotalIngreso() {
        return totalIngreso;
    }

    public void setTotalIngreso(BigDecimal totalIngreso) {
        this.totalIngreso = totalIngreso;
    }

    public BigDecimal getGananciaReal() {
        return gananciaReal;
    }

    public void setGananciaReal(BigDecimal gananciaReal) {
        this.gananciaReal = gananciaReal;
    }

    public EstadoVenta getEstado() {
        return estado;
    }

    public void setEstado(EstadoVenta estado) {
        this.estado = estado;
    }

    public String getObservaciones() {
        return observaciones;
    }

    public void setObservaciones(String observaciones) {
        this.observaciones = observaciones;
    }

    // ============ ENUM ESTADO ============

    /**
     * Estados posibles de una venta.
     */
    public enum EstadoVenta {
        CONFIRMADA,
        PAGADA,
        CANCELADA
    }

    // ============ MÉTODOS HELPER ============

    /**
     * Retorna cantidad de items en la venta.
     */
    public int getCantidadItems() {
        return items != null ? items.size() : 0;
    }

    /**
     * Verificar si la venta está pagada.
     */
    public boolean isPagada() {
        return estado == EstadoVenta.PAGADA;
    }

    /**
     * Verificar si la venta está confirmada.
     */
    public boolean isConfirmada() {
        return estado == EstadoVenta.CONFIRMADA;
    }

    /**
     * Marcar venta como pagada.
     */
    public void marcarComoPagada() {
        this.estado = EstadoVenta.PAGADA;
    }

    @Override
    public String toString() {
        return "Venta{" +
                "id=" + id +
                ", cliente=" + (cliente != null ? cliente.getNombre() : "null") +
                ", fecha=" + fecha +
                ", totalIngreso=" + totalIngreso +
                ", gananciaReal=" + gananciaReal +
                ", estado=" + estado +
                ", cantidadItems=" + getCantidadItems() +
                '}';
    }
}