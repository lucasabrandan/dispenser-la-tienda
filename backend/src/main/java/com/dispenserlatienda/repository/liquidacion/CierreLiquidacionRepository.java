package com.dispenserlatienda.repository.liquidacion;

import com.dispenserlatienda.domain.liquidacion.CierreLiquidacion;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface CierreLiquidacionRepository extends JpaRepository<CierreLiquidacion, Long> {
    Optional<CierreLiquidacion> findByTecnicoIdAndMes(Long tecnicoId, String mes);
}
