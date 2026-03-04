package com.dispenserlatienda.domain;

import jakarta.persistence.*;

@Entity
@Table(name = "cliente")
public class Cliente {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(name = "cliente_tipo", nullable = false)
    private ClienteTipo clienteTipo;

    @Column(nullable = false)
    private String nombre;

    @Column(name = "cuil_dni")
    private String cuilDni;

    private String telefono;
    private String email;
    private String notas;

    // 🏛️ NUEVO: Condición Fiscal ARCA 2026
    private String condicionIva;

    // 📍 Campos de Logística
    private String calle;
    private String numero;
    private String piso;
    private String depto;
    private String localidad;
    private String provincia;
    private String direccion;

    protected Cliente() {}

    public Cliente(ClienteTipo clienteTipo, String nombre, String cuilDni, String telefono, String email, String notas, String condicionIva) {
        this.clienteTipo = clienteTipo;
        this.nombre = nombre;
        this.cuilDni = cuilDni;
        this.telefono = telefono;
        this.email = email;
        this.notas = notas;
        this.condicionIva = condicionIva;
    }

    // =================================================================
    // 🛠️ MÉTODOS DE COMPATIBILIDAD (PUENTE)
    // =================================================================

    public String getRazonSocialNombre() {
        return this.nombre;
    }

    public void setRazonSocialNombre(String razonSocialNombre) {
        this.nombre = razonSocialNombre;
    }

    // =================================================================
    // ⚙️ GETTERS Y SETTERS ESTÁNDAR
    // =================================================================

    public Long getId() { return id; }

    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }

    public String getCuilDni() { return cuilDni; }
    public void setCuilDni(String cuilDni) { this.cuilDni = cuilDni; }

    public String getTelefono() { return telefono; }
    public void setTelefono(String telefono) { this.telefono = telefono; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getNotas() { return notas; }
    public void setNotas(String notas) { this.notas = notas; }

    public ClienteTipo getClienteTipo() { return clienteTipo; }
    public void setClienteTipo(ClienteTipo clienteTipo) { this.clienteTipo = clienteTipo; }

    // ✅ GETTER Y SETTER PARA ARCA
    public String getCondicionIva() { return condicionIva; }
    public void setCondicionIva(String condicionIva) { this.condicionIva = condicionIva; }

    // 📍 Getters/Setters Logística
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
}