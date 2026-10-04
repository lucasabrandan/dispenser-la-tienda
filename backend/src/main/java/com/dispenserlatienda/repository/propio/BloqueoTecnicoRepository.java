package com.dispenserlatienda.repository.propio;

import com.dispenserlatienda.domain.propio.BloqueoTecnico;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface BloqueoTecnicoRepository extends JpaRepository<BloqueoTecnico, Long> {
    List<BloqueoTecnico> findByTecnicoIdOrderByDiaSemanaAscFechaAsc(Long tecnicoId);
    Optional<BloqueoTecnico> findByIdAndTecnicoId(Long id, Long tecnicoId);
}
