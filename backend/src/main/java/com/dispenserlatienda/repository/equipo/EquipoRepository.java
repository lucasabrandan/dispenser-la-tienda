package com.dispenserlatienda.repository.equipo;

import com.dispenserlatienda.domain.equipo.Equipo;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface EquipoRepository extends JpaRepository<Equipo, Long> {
    Optional<Equipo> findByNumeroSerie(String numeroSerie);
    boolean existsByNumeroSerie(String numeroSerie);
    boolean existsBySedeId(Long sedeId);  // ← AGREGADO

    List<Equipo> findByNumeroSerieContainingIgnoreCase(String numeroSerie, Pageable pageable);
    List<Equipo> findBySedeIdAndNumeroSerieContainingIgnoreCase(Long sedeId, String numeroSerie, Pageable pageable);
    List<Equipo> findBySedeId(Long sedeId);
}