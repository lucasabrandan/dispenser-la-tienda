package com.dispenserlatienda.repository.empresa;

import com.dispenserlatienda.domain.empresa.ResumenAprobacion;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ResumenAprobacionRepository extends JpaRepository<ResumenAprobacion, Long> {
    Optional<ResumenAprobacion> findByClienteIdAndMes(Long clienteId, String mes);
}
