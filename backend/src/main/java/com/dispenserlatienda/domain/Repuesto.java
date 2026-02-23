package com.dispenserlatienda.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "repuesto")
public class Repuesto {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String nombre;
    private BigDecimal precio;
    private Integer stock;

    protected Repuesto() {}
    public Repuesto(String nombre, BigDecimal precio, Integer stock) {
        this.nombre = nombre; this.precio = precio; this.stock = stock;
    }
    public Long getId() { return id; }
    public String getNombre() { return nombre; }
    public BigDecimal getPrecio() { return precio; }
}