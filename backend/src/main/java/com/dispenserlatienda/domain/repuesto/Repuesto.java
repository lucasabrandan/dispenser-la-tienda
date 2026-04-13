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
    private BigDecimal porcentajeMarkup; // ← NUEVO

    @Column(nullable = false)
    private BigDecimal precio;

    // ← NUEVO: Para guardar precio lista (calculado en frontend, guardamos acá para ref)
    private BigDecimal precioLista;

    @Column(nullable = false)
    private Integer stock = 0;

    // ← MODIFICADO: Ahora guarda URL relativa de foto (/uploads/productos/nombre.jpg)
    private String fotoUrl;

    // ← MANTENER: Por backward compatibility (ya no se usa, fotoUrl reemplaza esto)
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

    public BigDecimal getPrecioLista() { return precioLista; } // ← NUEVO
    public void setPrecioLista(BigDecimal precioLista) { this.precioLista = precioLista; }

    public Integer getStock() { return stock; }
    public void setStock(Integer stock) { this.stock = stock; }

    public String getFotoUrl() { return fotoUrl; } // ← NUEVO
    public void setFotoUrl(String fotoUrl) { this.fotoUrl = fotoUrl; }

    public String getImagen() { return imagen; }
    public void setImagen(String imagen) { this.imagen = imagen; }
}