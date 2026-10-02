package com.dispenserlatienda.repository.equipo;

import com.dispenserlatienda.domain.equipo.Equipo;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface EquipoRepository extends JpaRepository<Equipo, Long> {
    Optional<Equipo> findFirstByNumeroSerie(String numeroSerie);
    boolean existsByNumeroSerie(String numeroSerie);
    boolean existsBySedeId(Long sedeId);  // ← AGREGADO

    List<Equipo> findByNumeroSerieContainingIgnoreCase(String numeroSerie, Pageable pageable);
    List<Equipo> findBySedeIdAndNumeroSerieContainingIgnoreCase(Long sedeId, String numeroSerie, Pageable pageable);
    List<Equipo> findBySedeId(Long sedeId);

    // Nativa a propósito: incluye equipos archivados, porque numero_serie es UNIQUE en toda la tabla.
    @Query(value = "SELECT numero_serie FROM equipo WHERE UPPER(numero_serie) LIKE CONCAT(UPPER(:base), '%')", nativeQuery = true)
    List<String> seriesQueEmpiezanCon(@Param("base") String base);
}