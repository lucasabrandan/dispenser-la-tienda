package com.dispenserlatienda.repository.venta;

import com.dispenserlatienda.domain.venta.VentaItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

/**
 * Repository para VentaItem.
 */
public interface VentaItemRepository extends JpaRepository<VentaItem, Long> {

    // Eliminar todos los items de una venta
    @Modifying
    @Transactional
    @Query("DELETE FROM VentaItem vi WHERE vi.venta.id = :ventaId")
    void deleteByVentaId(@Param("ventaId") Long ventaId);
}