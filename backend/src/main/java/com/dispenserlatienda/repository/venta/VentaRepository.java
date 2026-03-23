package com.dispenserlatienda.repository.venta;

import com.dispenserlatienda.domain.venta.Venta;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Repository para Venta.
 * Proporciona métodos de búsqueda y consultas agregadas.
 */
public interface VentaRepository extends JpaRepository<Venta, Long> {

    // Buscar por cliente
    Page<Venta> findByClienteId(Long clienteId, Pageable pageable);

    // Buscar por rango de fechas
    Page<Venta> findByFechaBetween(LocalDate fechaInicio, LocalDate fechaFin, Pageable pageable);

    // Buscar por cliente Y rango de fechas
    @Query("SELECT v FROM Venta v WHERE v.cliente.id = :clienteId AND v.fecha BETWEEN :fechaInicio AND :fechaFin")
    Page<Venta> findByClienteIdAndFechaBetween(
            @Param("clienteId") Long clienteId,
            @Param("fechaInicio") LocalDate fechaInicio,
            @Param("fechaFin") LocalDate fechaFin,
            Pageable pageable
    );

    // Listar todas ordenadas por fecha descendente
    Page<Venta> findAllByOrderByFechaDesc(Pageable pageable);

    // Total de ventas en un período
    @Query("SELECT COUNT(v) FROM Venta v WHERE v.fecha BETWEEN :fechaInicio AND :fechaFin")
    long countByPeriodo(@Param("fechaInicio") LocalDate fechaInicio, @Param("fechaFin") LocalDate fechaFin);

    // Total de ingresos en un período
    @Query("SELECT SUM(v.totalIngreso) FROM Venta v WHERE v.fecha BETWEEN :fechaInicio AND :fechaFin")
    BigDecimal sumIngresosByPeriodo(@Param("fechaInicio") LocalDate fechaInicio, @Param("fechaFin") LocalDate fechaFin);

    // Total de costos en un período
    @Query("SELECT SUM(v.subtotalCosto) FROM Venta v WHERE v.fecha BETWEEN :fechaInicio AND :fechaFin")
    BigDecimal sumCostosByPeriodo(@Param("fechaInicio") LocalDate fechaInicio, @Param("fechaFin") LocalDate fechaFin);

    // Total de ganancia en un período
    @Query("SELECT SUM(v.gananciaReal) FROM Venta v WHERE v.fecha BETWEEN :fechaInicio AND :fechaFin")
    BigDecimal sumGananciaByPeriodo(@Param("fechaInicio") LocalDate fechaInicio, @Param("fechaFin") LocalDate fechaFin);
}