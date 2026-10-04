package com.dispenserlatienda.repository.liquidacion;

import com.dispenserlatienda.domain.liquidacion.MovimientoSocio;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface MovimientoSocioRepository extends JpaRepository<MovimientoSocio, Long> {
    List<MovimientoSocio> findByTecnicoIdAndMesOrderByFechaAscIdAsc(Long tecnicoId, String mes);
}
