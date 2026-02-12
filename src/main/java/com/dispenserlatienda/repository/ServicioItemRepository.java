package com.dispenserlatienda.repository;

import com.dispenserlatienda.domain.servicio.ServicioItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ServicioItemRepository extends JpaRepository<ServicioItem, Long> {

    List<ServicioItem> findByEquipoId(Long equipoId);

}
