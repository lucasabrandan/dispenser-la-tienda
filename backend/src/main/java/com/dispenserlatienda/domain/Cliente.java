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

    // 💡 AGREGADO: Para que coincida con lo que manda el DTO y el Service
    private String notas;

    protected Cliente() {}

    // 💡 ACTUALIZADO: Cambiamos el "Object sedes" por "String notas" para que el Service no tire error
    public Cliente(ClienteTipo clienteTipo, String nombre, String cuilDni, String telefono, String email, String notas) {
        this.clienteTipo = clienteTipo;
        this.nombre = nombre;
        this.cuilDni = cuilDni;
        this.telefono = telefono;
        this.email = email;
        this.notas = notas;
    }

    // =================================================================
    // 🚀 GETTERS Y SETTERS
    // =================================================================

    public Long getId() { return id; }

    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }

    // Puente para código viejo
    public String getRazonSocialNombre() { return this.nombre; }
    public void setRazonSocialNombre(String razonSocialNombre) { this.nombre = razonSocialNombre; }

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

    // 💡 Puente para el DTO: Si el Service pide "getTipo()", le damos el "clienteTipo"
    public ClienteTipo getTipo() { return this.clienteTipo; }
}