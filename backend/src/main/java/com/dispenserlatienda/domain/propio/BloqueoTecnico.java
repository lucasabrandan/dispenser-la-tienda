package com.dispenserlatienda.domain.propio;

import com.dispenserlatienda.domain.usuario.Usuario;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import java.time.LocalDate;

// Día/franja en que el técnico/socio NO está disponible para Dispenser La Tienda
// porque trabaja en lo suyo (5-oct-2026). Puntual (fecha) o semanal (diaSemana
// 1=lunes … 7=domingo). La nota es privada: el admin solo ve "ocupado".
@Entity
@Table(name = "bloqueo_tecnico")
public class BloqueoTecnico {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "tecnico_id", nullable = false)
    private Usuario tecnico;

    private LocalDate fecha;

    @Column(name = "dia_semana")
    private Integer diaSemana;

    // MANANA | TARDE | DIA
    @Column(nullable = false, length = 10)
    private String franja;

    @Column(length = 200)
    private String nota;

    public Long getId() { return id; }
    public Usuario getTecnico() { return tecnico; }
    public void setTecnico(Usuario tecnico) { this.tecnico = tecnico; }
    public LocalDate getFecha() { return fecha; }
    public void setFecha(LocalDate fecha) { this.fecha = fecha; }
    public Integer getDiaSemana() { return diaSemana; }
    public void setDiaSemana(Integer diaSemana) { this.diaSemana = diaSemana; }
    public String getFranja() { return franja; }
    public void setFranja(String franja) { this.franja = franja; }
    public String getNota() { return nota; }
    public void setNota(String nota) { this.nota = nota; }
}
