package com.dispenserlatienda.repository.orden;

import com.dispenserlatienda.domain.orden.NotaAgenda;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;

public interface NotaAgendaRepository extends JpaRepository<NotaAgenda, Long> {

    List<NotaAgenda> findByTecnicoIdAndFechaBetweenOrderByFechaAscHoraEstimadaAsc(
        Long tecnicoId, LocalDate desde, LocalDate hasta);

    List<NotaAgenda> findByTecnicoIdOrderByFechaAscHoraEstimadaAsc(Long tecnicoId);
}
