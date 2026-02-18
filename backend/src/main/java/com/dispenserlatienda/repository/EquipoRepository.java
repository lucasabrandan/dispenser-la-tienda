package com.dispenserlatienda.repository;

import com.dispenserlatienda.domain.Equipo;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface EquipoRepository extends JpaRepository<Equipo, Long> {

    Optional<Equipo> findByNumeroSerie(String numeroSerie);

    // Autocompletado global
    List<Equipo> findByNumeroSerieContainingIgnoreCase(String numeroSerie, Pageable pageable);

    // Autocompletado dentro de una sede (más preciso)
    List<Equipo> findBySedeIdAndNumeroSerieContainingIgnoreCase(Long sedeId, String numeroSerie, Pageable pageable);

    // Lista de equipos por sede (si la usás en otro lado)
    List<Equipo> findBySedeId(Long sedeId);
}
