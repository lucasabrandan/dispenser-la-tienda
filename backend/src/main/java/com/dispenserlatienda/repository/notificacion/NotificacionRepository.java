package com.dispenserlatienda.repository.notificacion;

import com.dispenserlatienda.domain.notificacion.Notificacion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface NotificacionRepository extends JpaRepository<Notificacion, Long> {

    List<Notificacion> findByDestinoIdOrderByCreadoEnDesc(Long destinoId);

    List<Notificacion> findTop50ByDestinoIdOrderByCreadoEnDesc(Long destinoId);

    long countByDestinoIdAndLeidaFalse(Long destinoId);

    @Modifying
    @Query("UPDATE Notificacion n SET n.leida = true WHERE n.destino.id = :destinoId AND n.leida = false")
    int marcarTodasLeidas(Long destinoId);
}
