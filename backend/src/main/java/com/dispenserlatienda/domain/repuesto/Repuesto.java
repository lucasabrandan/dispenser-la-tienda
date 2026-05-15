package com.dispenserlatienda.domain.repuesto;

import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "repuesto")
public class Repuesto {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 💡 AHORA ES OBLIGATORIO Y NO SE PUEDE REPETIR
    @Column(nullable = false, unique = true, length = 50)
    private String sku;

    @Column(nullable = false)
    private String nombre;

    private String descripcion;

    private BigDecimal costo;
    private BigDecimal porcentajeGanancia;
    private BigDecimal porcentajeMarkup;

    @Column(nullable = false)
    private BigDecimal precio; // precio en negro (efectivo)

    private BigDecimal precioLista;

    // Pricing facturado
    private BigDecimal costoBlanco;         // costo × 1.21 (o manual)
    private BigDecimal porcentajeImpuestos; // default 30 en frontend
    private BigDecimal precioFacturado;     // costoBlanco × (1+ganancia%) × (1+imp%)
    private BigDecimal precioNetoCliente;   // precioFacturado / 1.21 (lo que se le dice al cliente)

    // Precio por cantidad / mayorista
    private BigDecimal precioCantidad;
    private Integer cantidadMinima;

    // Cuotas (solo almacena %, frontend calcula)
    private BigDecimal porcentajeCuotas3;
    private BigDecimal porcentajeCuotas6;

    @Column(nullable = false)
    private Integer stock = 0;

    private String fotoUrl;
    private String fotoUrl2;
    private String fotoUrl3;

    @Column(columnDefinition = "TEXT")
    private String imagen;

    public Repuesto() {}

    public Repuesto(String nombre, BigDecimal precio, Integer stock) {
        this.nombre = nombre;
        this.precio = precio;
        this.stock = stock;
    }

    public Repuesto(String nombre, String descripcion, BigDecimal precio, Integer stock) {
        this.nombre = nombre;
        this.descripcion = descripcion;
        this.precio = precio;
        this.stock = stock;
    }

    public Repuesto(String sku, String nombre, String descripcion, BigDecimal costo, BigDecimal porcentajeGanancia, BigDecimal precio, Integer stock) {
        this.sku = sku;
        this.nombre = nombre;
        this.descripcion = descripcion;
        this.costo = costo;
        this.porcentajeGanancia = porcentajeGanancia;
        this.precio = precio;
        this.stock = stock;
    }

    // --- GETTERS Y SETTERS ---
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getSku() { return sku; }
    public void setSku(String sku) { this.sku = sku; }

    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }

    public String getDescripcion() { return descripcion; }
    public void setDescripcion(String descripcion) { this.descripcion = descripcion; }

    public BigDecimal getCosto() { return costo; }
    public void setCosto(BigDecimal costo) { this.costo = costo; }

    public BigDecimal getPorcentajeGanancia() { return porcentajeGanancia; }
    public void setPorcentajeGanancia(BigDecimal porcentajeGanancia) { this.porcentajeGanancia = porcentajeGanancia; }

    public BigDecimal getPorcentajeMarkup() { return porcentajeMarkup; } // ← NUEVO
    public void setPorcentajeMarkup(BigDecimal porcentajeMarkup) { this.porcentajeMarkup = porcentajeMarkup; }

    public BigDecimal getPrecio() { return precio; }
    public void setPrecio(BigDecimal precio) { this.precio = precio; }

    public BigDecimal getPrecioLista() { return precioLista; }
    public void setPrecioLista(BigDecimal precioLista) { this.precioLista = precioLista; }

    public BigDecimal getCostoBlanco() { return costoBlanco; }
    public void setCostoBlanco(BigDecimal costoBlanco) { this.costoBlanco = costoBlanco; }

    public BigDecimal getPorcentajeImpuestos() { return porcentajeImpuestos; }
    public void setPorcentajeImpuestos(BigDecimal porcentajeImpuestos) { this.porcentajeImpuestos = porcentajeImpuestos; }

    public BigDecimal getPrecioFacturado() { return precioFacturado; }
    public void setPrecioFacturado(BigDecimal precioFacturado) { this.precioFacturado = precioFacturado; }

    public BigDecimal getPrecioNetoCliente() { return precioNetoCliente; }
    public void setPrecioNetoCliente(BigDecimal precioNetoCliente) { this.precioNetoCliente = precioNetoCliente; }

    public BigDecimal getPrecioCantidad() { return precioCantidad; }
    public void setPrecioCantidad(BigDecimal precioCantidad) { this.precioCantidad = precioCantidad; }

    public Integer getCantidadMinima() { return cantidadMinima; }
    public void setCantidadMinima(Integer cantidadMinima) { this.cantidadMinima = cantidadMinima; }

    public BigDecimal getPorcentajeCuotas3() { return porcentajeCuotas3; }
    public void setPorcentajeCuotas3(BigDecimal porcentajeCuotas3) { this.porcentajeCuotas3 = porcentajeCuotas3; }

    public BigDecimal getPorcentajeCuotas6() { return porcentajeCuotas6; }
    public void setPorcentajeCuotas6(BigDecimal porcentajeCuotas6) { this.porcentajeCuotas6 = porcentajeCuotas6; }

    public Integer getStock() { return stock; }
    public void setStock(Integer stock) { this.stock = stock; }

    public String getFotoUrl() { return fotoUrl; }
    public void setFotoUrl(String fotoUrl) { this.fotoUrl = fotoUrl; }

    public String getFotoUrl2() { return fotoUrl2; }
    public void setFotoUrl2(String fotoUrl2) { this.fotoUrl2 = fotoUrl2; }

    public String getFotoUrl3() { return fotoUrl3; }
    public void setFotoUrl3(String fotoUrl3) { this.fotoUrl3 = fotoUrl3; }

    public String getImagen() { return imagen; }
    public void setImagen(String imagen) { this.imagen = imagen; }
}