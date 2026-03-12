package com.dispenserlatienda.repository;

import com.dispenserlatienda.domain.servicio.ServicioItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface ServicioItemRepository extends JpaRepository<ServicioItem, Long> {

    Optional<ServicioItem> findTopByEquipoIdOrderByGarantiaHastaDesc(Long equipoId);

    List<ServicioItem> findByEquipoId(Long equipoId);  // ← AGREGADO

    @Modifying
    @Query("UPDATE ServicioItem si SET si.equipo = null WHERE si.equipo.id = :equipoId")
    void desvincularEquipo(Long equipoId);  // ← AGREGADO
}
