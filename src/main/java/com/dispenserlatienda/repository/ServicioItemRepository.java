package com.dispenserlatienda.repository;

import com.dispenserlatienda.domain.servicio.ServicioItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ServicioItemRepository extends JpaRepository<ServicioItem, Long> {

    List<ServicioItem> findByEquipoId(Long equipoId);

    // Para chequear garantía: traeme el item más reciente (por garantía_hasta)
    Optional<ServicioItem> findTopByEquipoIdOrderByGarantiaHastaDesc(Long equipoId);
}
