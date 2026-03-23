package com.dispenserlatienda.repository.repuesto;

import com.dispenserlatienda.domain.repuesto.Repuesto;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface RepuestoRepository extends JpaRepository<Repuesto, Long> {
}