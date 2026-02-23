package com.dispenserlatienda.domain;

// 💡 1. IMPORTANTE: Agregamos esta importación para que funcione el freno del JSON
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;

@Entity
@Table(name = "equipo")
public class Equipo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 💡 2. LA MAGIA CONTRA EL ERROR 500: Le decimos a Java que ignore la basura interna y no haga un bucle infinito
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sede_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "equipos", "cliente"})
    private Sede sede;

    private String marca;
    private String modelo;

    @Column(name = "numero_serie", nullable = false)
    private String numeroSerie;

    private String ubicacion;
    private String observaciones;

    // Constructor vacío exigido por JPA
    protected Equipo() {}

    // Constructor completo actualizado
    public Equipo(Sede sede, String marca, String modelo, String numeroSerie, String ubicacion, String observaciones) {
        this.sede = sede;
        this.marca = marca;
        this.modelo = modelo;
        this.numeroSerie = numeroSerie;
        this.ubicacion = ubicacion;
        this.observaciones = observaciones;
    }

    // =================================================================
    // 🚀 GETTERS Y SETTERS
    // =================================================================

    public Long getId() {
        return id;
    }

    public Sede getSede() {
        return sede;
    }

    public void setSede(Sede sede) {
        this.sede = sede;
    }

    public String getMarca() {
        return marca;
    }

    public void setMarca(String marca) {
        this.marca = marca;
    }

    public String getModelo() {
        return modelo;
    }

    public void setModelo(String modelo) {
        this.modelo = modelo;
    }

    public String getNumeroSerie() {
        return numeroSerie;
    }

    public void setNumeroSerie(String numeroSerie) {
        this.numeroSerie = numeroSerie;
    }

    public String getUbicacion() {
        return ubicacion;
    }

    public void setUbicacion(String ubicacion) {
        this.ubicacion = ubicacion;
    }

    public String getObservaciones() {
        return observaciones;
    }

    public void setObservaciones(String observaciones) {
        this.observaciones = observaciones;
    }
}