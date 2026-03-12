package com.dispenserlatienda.repository;

import com.dispenserlatienda.domain.Sede;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface SedeRepository extends JpaRepository<Sede, Long> {

    List<Sede> findByClienteId(Long clienteId);
    List<Sede> findByClienteIdAndActivaTrue(Long clienteId); // ← solo activas
    Optional<Sede> findByClienteIdAndNombreSede(Long clienteId, String nombreSede);
    List<Sede> findByActivaFalse(); // ← para listar archivadas si se necesita
}
