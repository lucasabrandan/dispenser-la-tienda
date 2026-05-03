package com.dispenserlatienda.domain.equipo;

import com.dispenserlatienda.domain.common.BaseEntity;
import com.dispenserlatienda.domain.sede.Sede;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;

@Entity
@Table(name = "equipo")
public class Equipo extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sede_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "equipos", "cliente"})
    private Sede sede;

    private String marca;
    private String modelo;

    @Column(name = "numero_serie", nullable = false)
    private String numeroSerie;

    private String ubicacion;
    private String piso;
    private String sector;
    private String observaciones;

    // Constructor vacío exigido por JPA
    protected Equipo() {}

    // Constructor completo actualizado
    public Equipo(Sede sede, String marca, String modelo, String numeroSerie, String ubicacion, String piso, String sector, String observaciones) {
        super();
        this.sede = sede;
        this.marca = marca;
        this.modelo = modelo;
        this.numeroSerie = numeroSerie;
        this.ubicacion = ubicacion;
        this.piso = piso;
        this.sector = sector;
        this.observaciones = observaciones;
    }

    // =================================================================
    // 🚀 GETTERS Y SETTERS
    // =================================================================

    // getId() heredado de BaseEntity ✅

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

    public String getPiso() {
        return piso;
    }

    public void setPiso(String piso) {
        this.piso = piso;
    }

    public String getSector() {
        return sector;
    }

    public void setSector(String sector) {
        this.sector = sector;
    }

    public String getObservaciones() {
        return observaciones;
    }

    public void setObservaciones(String observaciones) {
        this.observaciones = observaciones;
    }

    // isActive(), setActive(), getCreatedAt(), getUpdatedAt() heredados de BaseEntity ✅
}