package com.dispenserlatienda.domain;

import jakarta.persistence.*;
import java.time.LocalDate;

@Entity
@Table(name = "equipo", uniqueConstraints = {
        @UniqueConstraint(name = "uk_equipo_numero_serie", columnNames = "numero_serie")
})
public class Equipo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "sede_id", nullable = false,
            foreignKey = @ForeignKey(name = "fk_equipo_sede"))
    private Sede sede;

    @Column(name = "marca", length = 100)
    private String marca;

    @Column(name = "modelo", length = 100)
    private String modelo;

    @Column(name = "numero_serie", nullable = false, length = 100)
    private String numeroSerie;

    @Column(name = "ubicacion_interna", length = 150)
    private String ubicacionInterna;

    @Column(name = "proximo_cambio_filtro")
    private LocalDate proximoCambioFiltro;

    @Column(name = "estado", length = 50)
    private String estado;

    @Column(name = "notas", length = 500)
    private String notas;

    // JPA obligatorio
    protected Equipo() { }

    // Constructor mínimo
    public Equipo(Sede sede, String numeroSerie) {
        this.sede = sede;
        this.numeroSerie = numeroSerie;
    }

    // Constructor completo para Seed/Carga masiva
    public Equipo(Sede sede,
                  String marca,
                  String modelo,
                  String numeroSerie,
                  String ubicacionInterna,
                  String notas) {
        this.sede = sede;
        this.marca = marca;
        this.modelo = modelo;
        this.numeroSerie = numeroSerie;
        this.ubicacionInterna = ubicacionInterna;
        this.notas = notas;
    }

    // --- GETTERS (Necesarios para DTOs y Lógica de Negocio) ---

    public Long getId() { return id; }
    public Sede getSede() { return sede; }
    public String getMarca() { return marca; }
    public String getModelo() { return modelo; }
    public String getNumeroSerie() { return numeroSerie; }
    public String getUbicacionInterna() { return ubicacionInterna; }
    public LocalDate getProximoCambioFiltro() { return proximoCambioFiltro; }
    public String getEstado() { return estado; }
    public String getNotas() { return notas; }

    // --- SETTERS ---

    public void setMarca(String marca) { this.marca = marca; }
    public void setModelo(String modelo) { this.modelo = modelo; }
    public void setUbicacionInterna(String ubicacionInterna) { this.ubicacionInterna = ubicacionInterna; }
    public void setProximoCambioFiltro(LocalDate proximoCambioFiltro) { this.proximoCambioFiltro = proximoCambioFiltro; }
    public void setEstado(String estado) { this.estado = estado; }
    public void setNotas(String notas) { this.notas = notas; }
}