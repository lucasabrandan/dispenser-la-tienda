package com.dispenserlatienda.repository.rendicion;

import com.dispenserlatienda.domain.rendicion.Rendicion;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface RendicionRepository extends JpaRepository<Rendicion, Long> {
    Optional<Rendicion> findByTecnicoIdAndFecha(Long tecnicoId, LocalDate fecha);
    List<Rendicion> findByRecibidoFalseOrderByFechaAsc();
}
