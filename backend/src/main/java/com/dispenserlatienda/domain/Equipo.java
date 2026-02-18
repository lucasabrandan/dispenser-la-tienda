package com.dispenserlatienda.domain;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;

@Entity
@Table(name = "equipo")
public class Equipo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "numero_serie", nullable = false, unique = true)
    private String numeroSerie;

    private String modelo;
    private String marca;       // Agregamos Marca
    private String ubicacion;   // Ej: "Cocina 2do piso"
    private String notas;

    @ManyToOne(optional = false)
    @JoinColumn(name = "sede_id", nullable = false)
    @JsonIgnoreProperties({"equipos", "cliente"}) // Evitamos bucles infinitos al leer la sede
    private Sede sede;

    // 1. Constructor vacío (Obligatorio para JPA/Hibernate)
    protected Equipo() {}

    // 2. CONSTRUCTOR QUE NECESITA TU CONTROLLER (EL QUE FALTABA) 🛠️
    public Equipo(String numeroSerie, String modelo, String marca, Sede sede) {
        this.numeroSerie = numeroSerie;
        this.modelo = modelo;
        this.marca = marca;
        this.sede = sede;
    }

    // 3. Constructor completo (para otros usos)
    public Equipo(Sede sede, String numeroSerie, String modelo, String marca, String ubicacion, String notas) {
        this.sede = sede;
        this.numeroSerie = numeroSerie;
        this.modelo = modelo;
        this.marca = marca;
        this.ubicacion = ubicacion;
        this.notas = notas;
    }

    // Getters y Setters
    public Long getId() { return id; }
    public String getNumeroSerie() { return numeroSerie; }
    public String getModelo() { return modelo; }
    public String getMarca() { return marca; }
    public String getUbicacion() { return ubicacion; }
    public String getNotas() { return notas; }
    public Sede getSede() { return sede; }

    public void setNumeroSerie(String numeroSerie) { this.numeroSerie = numeroSerie; }
    public void setModelo(String modelo) { this.modelo = modelo; }
    public void setMarca(String marca) { this.marca = marca; }
    public void setUbicacion(String ubicacion) { this.ubicacion = ubicacion; }
    public void setNotas(String notas) { this.notas = notas; }
    public void setSede(Sede sede) { this.sede = sede; }
}