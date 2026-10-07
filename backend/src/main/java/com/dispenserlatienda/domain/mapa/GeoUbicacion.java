package com.dispenserlatienda.domain.mapa;

import jakarta.persistence.*;
import java.time.LocalDateTime;

// Mapa (7-oct-2026): coordenadas de cada dirección, buscadas UNA vez y guardadas.
// La clave es la dirección normalizada; si cambia la dirección, es otra clave.
// manual = la corrigió el admin a mano en el mapa (no se vuelve a buscar).
@Entity
@Table(name = "geo_ubicacion", uniqueConstraints = @UniqueConstraint(name = "uk_geo_clave", columnNames = "clave"))
public class GeoUbicacion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 500)
    private String clave;

    @Column(length = 500)
    private String direccion;

    private Double lat;
    private Double lng;

    // PENDIENTE | OK | NO_ENCONTRADA (String: la base puede tener CHECK viejos en enums)
    @Column(nullable = false, length = 20)
    private String estado = "PENDIENTE";

    @Column(nullable = false)
    private boolean manual = false;

    @Column(name = "actualizado_en")
    private LocalDateTime actualizadoEn = LocalDateTime.now();

    public Long getId() { return id; }
    public String getClave() { return clave; }
    public void setClave(String v) { this.clave = v; }
    public String getDireccion() { return direccion; }
    public void setDireccion(String v) { this.direccion = v; }
    public Double getLat() { return lat; }
    public void setLat(Double v) { this.lat = v; }
    public Double getLng() { return lng; }
    public void setLng(Double v) { this.lng = v; }
    public String getEstado() { return estado; }
    public void setEstado(String v) { this.estado = v; }
    public boolean isManual() { return manual; }
    public void setManual(boolean v) { this.manual = v; }
    public LocalDateTime getActualizadoEn() { return actualizadoEn; }
    public void setActualizadoEn(LocalDateTime v) { this.actualizadoEn = v; }
}
