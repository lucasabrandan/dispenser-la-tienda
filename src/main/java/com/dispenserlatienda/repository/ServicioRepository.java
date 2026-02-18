package com.dispenserlatienda.repository;

import com.dispenserlatienda.domain.servicio.Servicio;
import com.dispenserlatienda.domain.servicio.ServicioTipo;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate;

public interface ServicioRepository extends JpaRepository<Servicio, Long> {

    // Cambiamos "AndTipo" por "AndServicioTipo"
    boolean existsBySedeIdAndUsuarioIdAndFechaServicioAndServicioTipo(
            Long sedeId,
            Long usuarioId,
            LocalDate fechaServicio,
            ServicioTipo servicioTipo
    );

}