package com.dispenserlatienda.repository.servicio;

import com.dispenserlatienda.domain.servicio.ServicioItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

public interface ServicioItemRepository extends JpaRepository<ServicioItem, Long> {

    @Modifying
    @Transactional
    @Query("DELETE FROM ServicioItem si WHERE si.equipo.id = :equipoId")
    void desvincularEquipo(@Param("equipoId") Long equipoId);

    @Modifying
    @Transactional
    @Query("DELETE FROM ServicioItem si WHERE si.equipo.id = :equipoId")
    void deleteByEquipoId(@Param("equipoId") Long equipoId);

    /**
     * Devuelve, por cada equipo con al menos un servicio REALIZADO:
     *  - la fecha del último servicio (para calcular alerta SANITIZACION)
     *  - la fecha del último servicio con texto 'filtro' (para alerta FILTRO)
     * Usa CTE con DISTINCT ON para obtener el cliente/sede del servicio más reciente.
     */
    @Query(value = """
        WITH ultimo_srv AS (
            SELECT DISTINCT ON (e.id)
                e.id               AS equipo_id,
                e.numero_serie     AS serial,
                s.cliente_nombre   AS clienteNombre,
                s.sede_nombre      AS sedeNombre,
                cl.telefono        AS clienteTelefono,
                s.fecha_servicio   AS ultimoServicio
            FROM servicio_items si
            JOIN servicio s  ON si.servicio_id = s.id
            JOIN equipo   e  ON si.equipo_id   = e.id
            JOIN sede     sd ON e.sede_id       = sd.id
            JOIN cliente  cl ON sd.cliente_id   = cl.id
            WHERE s.estado = 'REALIZADO'
              AND e.numero_serie IS NOT NULL
              AND LOWER(e.numero_serie) <> 'mostrador'
            ORDER BY e.id, s.fecha_servicio DESC
        ),
        ultimo_filtro AS (
            SELECT si.equipo_id, MAX(s.fecha_servicio) AS ultimoFiltro
            FROM servicio_items si
            JOIN servicio s ON si.servicio_id = s.id
            WHERE s.estado = 'REALIZADO'
              AND LOWER(si.trabajo_realizado) LIKE '%filtro%'
            GROUP BY si.equipo_id
        )
        SELECT
            u.serial            AS serial,
            u.clienteNombre     AS clienteNombre,
            u.sedeNombre        AS sedeNombre,
            u.clienteTelefono   AS clienteTelefono,
            u.ultimoServicio    AS ultimoServicio,
            f.ultimoFiltro      AS ultimoFiltro
        FROM ultimo_srv u
        LEFT JOIN ultimo_filtro f ON u.equipo_id = f.equipo_id
        """, nativeQuery = true)
    List<RadarEquipoProjection> findRadarData();
}