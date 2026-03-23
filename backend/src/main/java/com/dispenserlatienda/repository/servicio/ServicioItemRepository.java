package com.dispenserlatienda.repository.servicio;

import com.dispenserlatienda.domain.servicio.ServicioItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

public interface ServicioItemRepository extends JpaRepository<ServicioItem, Long> {

    @Modifying
    @Transactional
    @Query("DELETE FROM ServicioItem si WHERE si.equipo.id = :equipoId")
    void desvincularEquipo(@Param("equipoId") Long equipoId);

    @Modifying
    @Transactional
    @Query("DELETE FROM ServicioItem si WHERE si.equipo.id = :equipoId")
    void deleteByEquipoId(@Param("equipoId") Long equipoId);
}