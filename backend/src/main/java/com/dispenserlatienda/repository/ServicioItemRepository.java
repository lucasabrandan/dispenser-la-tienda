package com.dispenserlatienda.repository;

import com.dispenserlatienda.domain.servicio.ServicioItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ServicioItemRepository extends JpaRepository<ServicioItem, Long> {

    // Último item (el que define garantía vigente) para un equipo
    Optional<ServicioItem> findTopByEquipoIdOrderByGarantiaHastaDesc(Long equipoId);
}
