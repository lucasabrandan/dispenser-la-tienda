package com.dispenserlatienda.repository;

import com.dispenserlatienda.domain.Sede;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

import java.util.List;

public interface SedeRepository extends JpaRepository<Sede, Long> {

    List<Sede> findByClienteId(Long clienteId);
    Optional<Sede> findByClienteIdAndNombreSede(Long clienteId, String nombreSede);

}
