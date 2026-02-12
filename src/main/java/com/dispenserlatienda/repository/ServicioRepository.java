package com.dispenserlatienda.repository;

import com.dispenserlatienda.domain.servicio.Servicio;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ServicioRepository extends JpaRepository<Servicio, Long> {

    // Opcional, útil para listar servicios de una sede:
    List<Servicio> findBySedeId(Long sedeId);
}
