package com.dispenserlatienda.repository.orden;

import com.dispenserlatienda.domain.orden.EstadoOrden;
import com.dispenserlatienda.domain.orden.OrdenVisita;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
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

    // Badges: solo lo de hoy o atrasado. Las órdenes programadas a futuro no piden acción todavía.
    @Query("SELECT COUNT(o) FROM OrdenVisita o WHERE o.tecnico.id = :tecnicoId AND o.estado IN ('PENDIENTE', 'EN_CAMINO', 'EN_SITIO') AND (o.fechaProgramada IS NULL OR o.fechaProgramada <= CURRENT_DATE)")
    long countActivasByTecnico(@Param("tecnicoId") Long tecnicoId);

    @Query("SELECT COUNT(o) FROM OrdenVisita o WHERE o.estado IN ('PENDIENTE', 'EN_CAMINO', 'EN_SITIO') AND (o.fechaProgramada IS NULL OR o.fechaProgramada <= CURRENT_DATE)")
    long countTodasActivas();

    // Activas de días anteriores al rango que se está mirando (atrasadas) o sin fecha:
    // el contador del menú las cuenta, así que el Despacho también tiene que mostrarlas.
    @Query("SELECT o FROM OrdenVisita o WHERE o.estado IN ('PENDIENTE', 'EN_CAMINO', 'EN_SITIO') AND (o.fechaProgramada IS NULL OR o.fechaProgramada < :desde) ORDER BY o.fechaProgramada ASC")
    List<OrdenVisita> findActivasAtrasadas(@Param("desde") LocalDate desde);

    boolean existsByPresupuestoId(Long presupuestoId);
    // ¿Este presupuesto/servicio le fue asignado a este técnico por una orden? (4-oct-2026)
    boolean existsByPresupuestoIdAndTecnicoId(Long presupuestoId, Long tecnicoId);
    boolean existsByIdAndTecnicoId(Long id, Long tecnicoId);
    boolean existsByPresupuestoIdAndEstadoNotIn(Long presupuestoId, List<EstadoOrden> estados);

    // Cuando el servicio/presupuesto se cierra por otro camino (Presupuestos → "Cerrar
    // trabajo", cobro, archivar), la orden del técnico quedaba abierta para siempre:
    // así se acumularon las órdenes "activas" viejas. Esto las cierra junto con él.
    @Modifying
    @Query("UPDATE OrdenVisita o SET o.estado = com.dispenserlatienda.domain.orden.EstadoOrden.COMPLETADA, o.fechaCompletada = CURRENT_TIMESTAMP " +
           "WHERE o.presupuestoId = :presupuestoId AND o.estado IN ('PENDIENTE', 'EN_CAMINO', 'EN_SITIO')")
    int completarActivasDePresupuesto(@Param("presupuestoId") Long presupuestoId);

    @Modifying
    @Query("UPDATE OrdenVisita o SET o.estado = com.dispenserlatienda.domain.orden.EstadoOrden.CANCELADA " +
           "WHERE o.presupuestoId = :presupuestoId AND o.estado IN ('PENDIENTE', 'EN_CAMINO', 'EN_SITIO')")
    int cancelarActivasDePresupuesto(@Param("presupuestoId") Long presupuestoId);

    @Modifying
    @Query("UPDATE OrdenVisita o SET o.tecnico = :tecnico, o.confirmadaEn = NULL " +
           "WHERE o.presupuestoId = :presupuestoId AND o.estado IN ('PENDIENTE', 'EN_CAMINO', 'EN_SITIO', 'NO_ATENDIDO')")
    int reasignarActivasDePresupuesto(@Param("presupuestoId") Long presupuestoId,
                                      @Param("tecnico") com.dispenserlatienda.domain.usuario.Usuario tecnico);

    // El técnico confirmó día y hora de un presupuesto "a coordinar": la orden lo sigue.
    @Modifying
    // Confirmar día y hora cuenta como "Ok, voy" (5-oct-2026)
    @Query("UPDATE OrdenVisita o SET o.fechaProgramada = :fecha, o.horaEstimada = :hora, o.confirmadaEn = CURRENT_TIMESTAMP " +
           "WHERE o.presupuestoId = :presupuestoId AND o.estado IN ('PENDIENTE', 'EN_CAMINO', 'EN_SITIO', 'NO_ATENDIDO')")
    int reprogramarActivasDePresupuesto(@Param("presupuestoId") Long presupuestoId,
                                        @Param("fecha") java.time.LocalDate fecha,
                                        @Param("hora") String hora);
}
