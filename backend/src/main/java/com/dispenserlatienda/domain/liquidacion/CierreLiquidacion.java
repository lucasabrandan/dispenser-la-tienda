package com.dispenserlatienda.domain.liquidacion;

import com.dispenserlatienda.domain.usuario.Usuario;
import jakarta.persistence.*;
import java.time.LocalDateTime;

// Mes cerrado de la liquidación de un técnico/socio (5-oct-2026). Guarda la foto
// de los números al cerrar: después no cambian aunque se edite un trabajo.
@Entity
@Table(name = "cierre_liquidacion", uniqueConstraints = @UniqueConstraint(columnNames = {"tecnico_id", "mes"}))
public class CierreLiquidacion {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "tecnico_id", nullable = false)
    private Usuario tecnico;

    @Column(nullable = false, length = 7)
    private String mes;

    @Column(name = "snapshot_json", columnDefinition = "TEXT", nullable = false)
    private String snapshotJson;

    @Column(name = "cerrado_en", nullable = false)
    private LocalDateTime cerradoEn = LocalDateTime.now();

    @Column(name = "aceptado_en")
    private LocalDateTime aceptadoEn;

    public Long getId() { return id; }
    public Usuario getTecnico() { return tecnico; }
    public void setTecnico(Usuario tecnico) { this.tecnico = tecnico; }
    public String getMes() { return mes; }
    public void setMes(String mes) { this.mes = mes; }
    public String getSnapshotJson() { return snapshotJson; }
    public void setSnapshotJson(String snapshotJson) { this.snapshotJson = snapshotJson; }
    public LocalDateTime getCerradoEn() { return cerradoEn; }
    public LocalDateTime getAceptadoEn() { return aceptadoEn; }
    public void setAceptadoEn(LocalDateTime aceptadoEn) { this.aceptadoEn = aceptadoEn; }
}
