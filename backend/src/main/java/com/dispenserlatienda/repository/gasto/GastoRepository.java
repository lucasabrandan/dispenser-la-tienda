package com.dispenserlatienda.repository.gasto;

import com.dispenserlatienda.domain.gasto.Gasto;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate;
import java.util.List;

public interface GastoRepository extends JpaRepository<Gasto, Long> {
    // Para el Dashboard: Filtrar gastos entre dos fechas
    List<Gasto> findByFechaBetween(LocalDate inicio, LocalDate fin);
}