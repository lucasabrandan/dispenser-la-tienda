package com.dispenserlatienda.domain.usuario;

import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "usuario", uniqueConstraints = {
        @UniqueConstraint(name = "uk_usuario_username", columnNames = "username")
})
public class Usuario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 120)
    private String nombre;

    @Column(nullable = false, length = 80)
    private String username;

    @Column(name = "password_hash", nullable = false, length = 255)
    private String passwordHash;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private RolUsuario rol;

    @Column(nullable = false)
    private boolean activo = true;

    @Column(length = 30)
    private String telefono;

    @Column(length = 30)
    private String whatsapp;

    @Column(columnDefinition = "TEXT")
    private String firma;

    @Column(name = "sueldo_objetivo")
    private BigDecimal sueldoObjetivo;

    // Mi Espacio (Lucas, 31-ago): tableros kanban de notas personales del admin.
    // Un solo blob JSON por usuario, mismo patron que costosRealesJson en Repuesto -
    // evita un esquema relacional completo para algo que es, en esencia, una lista anidada.
    @Column(name = "espacio_json", columnDefinition = "TEXT")
    private String espacioJson;

    protected Usuario() {
    }

    public Usuario(String nombre, String username, String passwordHash, RolUsuario rol) {
        this.nombre = nombre;
        this.username = username;
        this.passwordHash = passwordHash;
        this.rol = rol;
    }

    public Long getId() {
        return id;
    }

    public String getNombre() {
        return nombre;
    }

    public String getUsername() {
        return username;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public RolUsuario getRol() {
        return rol;
    }

    public boolean isActivo() {
        return activo;
    }

    public void setActivo(boolean activo) { this.activo = activo; }

    public void setNombre(String nombre) { this.nombre = nombre; }
    public void setUsername(String username) { this.username = username; }
    public void setPasswordHash(String passwordHash) { this.passwordHash = passwordHash; }
    public void setRol(RolUsuario rol) { this.rol = rol; }
    public String getTelefono() { return telefono; }
    public void setTelefono(String telefono) { this.telefono = telefono; }
    public String getWhatsapp() { return whatsapp; }
    public void setWhatsapp(String whatsapp) { this.whatsapp = whatsapp; }
    public String getFirma() { return firma; }
    public void setFirma(String firma) { this.firma = firma; }
    public BigDecimal getSueldoObjetivo() { return sueldoObjetivo; }
    public void setSueldoObjetivo(BigDecimal sueldoObjetivo) { this.sueldoObjetivo = sueldoObjetivo; }
    public String getEspacioJson() { return espacioJson; }
    public void setEspacioJson(String espacioJson) { this.espacioJson = espacioJson; }
}
