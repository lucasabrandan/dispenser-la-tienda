package com.dispenserlatienda.repository;

import com.dispenserlatienda.domain.Equipo;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface EquipoRepository extends JpaRepository<Equipo, Long> {
    // 🔍 Busca el dispenser por el número físico grabado
    Optional<Equipo> findByNumeroSerie(String numeroSerie);

    List<Equipo> findByNumeroSerieContainingIgnoreCase(String numeroSerie, Pageable pageable);
    List<Equipo> findBySedeIdAndNumeroSerieContainingIgnoreCase(Long sedeId, String numeroSerie, Pageable pageable);
    List<Equipo> findBySedeId(Long sedeId);
}