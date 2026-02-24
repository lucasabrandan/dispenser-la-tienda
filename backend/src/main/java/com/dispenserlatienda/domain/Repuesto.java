package com.dispenserlatienda.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "repuesto")
public class Repuesto {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // El código SKU (Ej: r12, cms)
    private String sku;

    @Column(nullable = false)
    private String nombre;

    private String descripcion;

    // Control de costos y ganancias
    private BigDecimal costo;
    private BigDecimal porcentajeGanancia;

    @Column(nullable = false)
    private BigDecimal precio; // Este será el Precio Final de Venta

    @Column(nullable = false)
    private Integer stock;

    // 💡 NUEVO: Acá se va a guardar la foto convertida a texto Base64
    @Lob
    @Column(columnDefinition = "LONGTEXT")
    private String imagen;

    // 1. Constructor vacío exigido por JPA
    public Repuesto() {}

    // 💡 2. EL CONSTRUCTOR SÚPER VIEJO (El que evita el error que te saltó recién)
    public Repuesto(String nombre, BigDecimal precio, Integer stock) {
        this.nombre = nombre;
        this.precio = precio;
        this.stock = stock;
    }

    // 💡 3. Constructor intermedio
    public Repuesto(String nombre, String descripcion, BigDecimal precio, Integer stock) {
        this.nombre = nombre;
        this.descripcion = descripcion;
        this.precio = precio;
        this.stock = stock;
    }

    // 💡 4. Constructor Súper Completo (El de la calculadora nueva)
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

    public BigDecimal getPrecio() { return precio; }
    public void setPrecio(BigDecimal precio) { this.precio = precio; }

    public Integer getStock() { return stock; }
    public void setStock(Integer stock) { this.stock = stock; }

    public String getImagen() { return imagen; }
    public void setImagen(String imagen) { this.imagen = imagen; }
}