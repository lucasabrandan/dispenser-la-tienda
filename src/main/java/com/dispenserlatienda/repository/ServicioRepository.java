package com.dispenserlatienda.repository;

import com.dispenserlatienda.domain.servicio.Servicio;
import com.dispenserlatienda.domain.servicio.ServicioTipo;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;

public interface ServicioRepository extends JpaRepository<Servicio, Long> {

    // Útil para listar servicios de una sede:
    List<Servicio> findBySedeId(Long sedeId);

    // ✅ Para que DevSeedRunner no cree servicios duplicados cada vez que arrancás la app
    boolean existsBySedeIdAndUsuarioIdAndFechaServicioAndTipo(
            Long sedeId,
            Long usuarioId,
            LocalDate fechaServicio,
            ServicioTipo tipo
    );
}
