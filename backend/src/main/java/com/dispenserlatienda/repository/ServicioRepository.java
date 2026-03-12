package com.dispenserlatienda.repository;

import com.dispenserlatienda.domain.servicio.Servicio;
import com.dispenserlatienda.domain.servicio.ServicioTipo;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate;
import java.util.List;

public interface ServicioRepository extends JpaRepository<Servicio, Long> {

    boolean existsBySedeIdAndUsuarioIdAndFechaServicioAndServicioTipo(
            Long sedeId, Long usuarioId, LocalDate fechaServicio, ServicioTipo servicioTipo);

    List<Servicio> findBySedeId(Long sedeId); // ← AGREGADO para borrado en cascada
}
