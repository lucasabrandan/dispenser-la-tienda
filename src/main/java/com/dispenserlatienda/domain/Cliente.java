package com.dispenserlatienda.domain;

import jakarta.persistence.*;

@Entity
@Table(name = "cliente")
public class Cliente {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ClienteTipo tipo;

    @Column(name = "razon_social_nombre", nullable = false)
    private String razonSocialNombre;

    @Column(name = "cuil_dni")
    private String cuilDni;

    private String telefono;
    private String email;

    @Column(length = 500)
    private String notas;

    // Constructor vacío (obligatorio para JPA)
    public Cliente() {
    }

    // Constructor completo (para crear objetos manualmente)
    public Cliente(ClienteTipo tipo,
                   String razonSocialNombre,
                   String cuilDni,
                   String telefono,
                   String email,
                   String notas) {

        this.tipo = tipo;
        this.razonSocialNombre = razonSocialNombre;
        this.cuilDni = cuilDni;
        this.telefono = telefono;
        this.email = email;
        this.notas = notas;
    }

    // Getters y Setters

    public Long getId() { return id; }

    public ClienteTipo getTipo() { return tipo; }
    public void setTipo(ClienteTipo tipo) { this.tipo = tipo; }

    public String getRazonSocialNombre() { return razonSocialNombre; }
    public void setRazonSocialNombre(String razonSocialNombre) {
        this.razonSocialNombre = razonSocialNombre;
    }

    public String getCuilDni() { return cuilDni; }
    public void setCuilDni(String cuilDni) { this.cuilDni = cuilDni; }

    public String getTelefono() { return telefono; }
    public void setTelefono(String telefono) { this.telefono = telefono; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getNotas() { return notas; }
    public void setNotas(String notas) { this.notas = notas; }
}
