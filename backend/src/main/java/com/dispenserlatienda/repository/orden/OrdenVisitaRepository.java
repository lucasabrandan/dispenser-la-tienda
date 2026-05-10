package com.dispenserlatienda.repository.orden;

import com.dispenserlatienda.domain.orden.EstadoOrden;
import com.dispenserlatienda.domain.orden.OrdenVisita;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

public interface OrdenVisitaRepository extends JpaRepository<OrdenVisita, Long> {

    List<OrdenVisita> findByTecnicoIdOrderByFechaProgramadaAscHoraEstimadaAsc(Long tecnicoId);

    List<OrdenVisita> findByFechaProgramadaBetweenOrderByTecnicoIdAscFechaProgramadaAsc(
        LocalDate desde, LocalDate hasta);

    @Query("SELECT o FROM OrdenVisita o WHERE o.tecnico.id = :tecnicoId AND o.estado NOT IN :excluidos ORDER BY o.fechaProgramada ASC, o.horaEstimada ASC")
    List<OrdenVisita> findActivasByTecnico(@Param("tecnicoId") Long tecnicoId,
                                           @Param("excluidos") List<EstadoOrden> excluidos);

    @Query("SELECT COUNT(o) FROM OrdenVisita o WHERE o.tecnico.id = :tecnicoId AND o.estado IN ('PENDIENTE', 'EN_CAMINO', 'EN_SITIO')")
    long countActivasByTecnico(@Param("tecnicoId") Long tecnicoId);

    @Query("SELECT COUNT(o) FROM OrdenVisita o WHERE o.estado IN ('PENDIENTE', 'EN_CAMINO', 'EN_SITIO')")
    long countTodasActivas();

    boolean existsByPresupuestoId(Long presupuestoId);
}
