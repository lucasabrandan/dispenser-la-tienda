package com.dispenserlatienda.repository.orden;

import com.dispenserlatienda.domain.orden.VisitaMensaje;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface VisitaMensajeRepository extends JpaRepository<VisitaMensaje, Long> {
    List<VisitaMensaje> findByOrdenIdOrderByIdAsc(Long ordenId);
}
