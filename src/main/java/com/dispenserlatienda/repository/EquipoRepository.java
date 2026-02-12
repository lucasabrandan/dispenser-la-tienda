package com.dispenserlatienda.repository;

import com.dispenserlatienda.domain.Equipo;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface EquipoRepository extends JpaRepository<Equipo, Long> {

    Optional<Equipo> findByNumeroSerie(String numeroSerie);

    List<Equipo> findByNumeroSerieContainingIgnoreCase(String numeroSerie);

    List<Equipo> findBySedeId(Long sedeId);

}
