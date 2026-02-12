package com.dispenserlatienda.domain;

import jakarta.persistence.*;

@Entity
@Table(name = "sede")
public class Sede {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "cliente_id", nullable = false)
    private Cliente cliente;

    @Column(name = "nombre_sede", nullable = false)
    private String nombreSede;

    private String direccion;
    private String localidad;

    @Column(length = 500)
    private String notas;

    // JPA
    protected Sede() {}

    // Constructor "de negocio"
    public Sede(Cliente cliente, String nombreSede, String direccion, String localidad, String notas) {
        this.cliente = cliente;
        this.nombreSede = nombreSede;
        this.direccion = direccion;
        this.localidad = localidad;
        this.notas = notas;
    }

    public Long getId() { return id; }
    public Cliente getCliente() { return cliente; }
    public String getNombreSede() { return nombreSede; }
    public String getDireccion() { return direccion; }
    public String getLocalidad() { return localidad; }
    public String getNotas() { return notas; }
}
