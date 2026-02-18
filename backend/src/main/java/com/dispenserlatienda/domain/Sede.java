package com.dispenserlatienda.domain;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "sede")
public class Sede {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "cliente_id", nullable = false)
    // 1. Evitamos el bucle con Cliente
    @JsonIgnoreProperties({"sedes", "equipos", "hibernateLazyInitializer", "handler"})
    private Cliente cliente;

    @Column(name = "nombre_sede", nullable = false)
    private String nombreSede;

    private String direccion;
    private String localidad;

    @Column(length = 500)
    private String notas;

    // --- ESTO ES LO QUE FALTABA PARA ARREGLAR EL ERROR 500 EN /api/equipos ---
    @OneToMany(mappedBy = "sede")
    @JsonIgnore // 🛑 ¡ESTO CORTA EL BUCLE INFINITO!
    private List<Equipo> equipos = new ArrayList<>();
    // -------------------------------------------------------------------------

    // JPA requiere constructor vacío
    protected Sede() {}

    // Constructor completo
    public Sede(Cliente cliente, String nombreSede, String direccion, String localidad, String notas) {
        this.cliente = cliente;
        this.nombreSede = nombreSede;
        this.direccion = direccion;
        this.localidad = localidad;
        this.notas = notas;
    }

    // Getters
    public Long getId() { return id; }
    public Cliente getCliente() { return cliente; }
    public String getNombreSede() { return nombreSede; }
    public String getDireccion() { return direccion; }
    public String getLocalidad() { return localidad; }
    public String getNotas() { return notas; }

    // Getter para usar en lógica interna (Java), aunque JSON lo ignore
    public List<Equipo> getEquipos() { return equipos; }
}