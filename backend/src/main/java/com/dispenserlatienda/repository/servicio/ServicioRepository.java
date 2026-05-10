package com.dispenserlatienda.repository.servicio;

import com.dispenserlatienda.domain.servicio.Servicio;
import com.dispenserlatienda.domain.servicio.ServicioTipo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import java.time.LocalDate;
import java.util.List;

public interface ServicioRepository extends JpaRepository<Servicio, Long>, JpaSpecificationExecutor<Servicio> {

    boolean existsBySedeIdAndUsuarioIdAndFechaServicioAndServicioTipo(
            Long sedeId, Long usuarioId, LocalDate fechaServicio, ServicioTipo servicioTipo);

    List<Servicio> findBySedeId(Long sedeId);

    boolean existsByUsuarioId(Long usuarioId);

    boolean existsByOrdenId(Long ordenId);
}
