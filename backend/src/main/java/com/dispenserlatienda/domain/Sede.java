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
    @JsonIgnoreProperties({"sedes", "equipos", "hibernateLazyInitializer", "handler"})
    private Cliente cliente;

    @Column(name = "nombre_sede", nullable = false)
    private String nombreSede;

    // --- 📍 NUEVA ESTRUCTURA DE DIRECCIÓN (Logística Pro) ---
    private String calle;
    private String numero;
    private String piso;
    private String depto;
    private String localidad;
    private String provincia;
    private String direccion; // String combinado para mostrar rápido en listas

    @Column(length = 500)
    private String notas;

    @OneToMany(mappedBy = "sede", cascade = CascadeType.ALL)
    @JsonIgnore
    private List<Equipo> equipos = new ArrayList<>();

    // JPA requiere constructor vacío
    protected Sede() {}

    // Constructor completo actualizado
    public Sede(Cliente cliente, String nombreSede, String calle, String numero, String piso,
                String depto, String localidad, String provincia, String direccion, String notas) {
        this.cliente = cliente;
        this.nombreSede = nombreSede;
        this.calle = calle;
        this.numero = numero;
        this.piso = piso;
        this.depto = depto;
        this.localidad = localidad;
        this.provincia = provincia;
        this.direccion = direccion;
        this.notas = notas;
    }

    // =================================================================
    // ⚙️ GETTERS Y SETTERS
    // =================================================================

    public Long getId() { return id; }

    public Cliente getCliente() { return cliente; }
    public void setCliente(Cliente cliente) { this.cliente = cliente; }

    public String getNombreSede() { return nombreSede; }
    public void setNombreSede(String nombreSede) { this.nombreSede = nombreSede; }

    public String getCalle() { return calle; }
    public void setCalle(String calle) { this.calle = calle; }

    public String getNumero() { return numero; }
    public void setNumero(String numero) { this.numero = numero; }

    public String getPiso() { return piso; }
    public void setPiso(String piso) { this.piso = piso; }

    public String getDepto() { return depto; }
    public void setDepto(String depto) { this.depto = depto; }

    public String getLocalidad() { return localidad; }
    public void setLocalidad(String localidad) { this.localidad = localidad; }

    public String getProvincia() { return provincia; }
    public void setProvincia(String provincia) { this.provincia = provincia; }

    public String getDireccion() { return direccion; }
    public void setDireccion(String direccion) { this.direccion = direccion; }

    public String getNotas() { return notas; }
    public void setNotas(String notas) { this.notas = notas; }

    public List<Equipo> getEquipos() { return equipos; }
}