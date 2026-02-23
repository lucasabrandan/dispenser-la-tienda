package com.dispenserlatienda.repository;

import com.dispenserlatienda.domain.Repuesto;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * Al extender JpaRepository, este archivo gana automáticamente métodos como
 * save(), saveAndFlush(), findById(), etc..
 */
@Repository
public interface RepuestoRepository extends JpaRepository<Repuesto, Long> {
    // Aquí podés agregar métodos de búsqueda personalizados si los necesitás en el futuro.
}