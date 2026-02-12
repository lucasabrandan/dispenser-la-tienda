package com.dispenserlatienda.repository;

import com.dispenserlatienda.domain.servicio.Servicio;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ServicioRepository extends JpaRepository<Servicio, Long> {

    List<Servicio> findByEquipoId(Long equipoId);

}
