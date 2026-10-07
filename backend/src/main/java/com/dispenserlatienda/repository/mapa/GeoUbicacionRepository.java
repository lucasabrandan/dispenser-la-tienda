package com.dispenserlatienda.repository.mapa;

import com.dispenserlatienda.domain.mapa.GeoUbicacion;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface GeoUbicacionRepository extends JpaRepository<GeoUbicacion, Long> {
    Optional<GeoUbicacion> findByClave(String clave);
    List<GeoUbicacion> findByClaveIn(Collection<String> claves);
    Optional<GeoUbicacion> findFirstByEstadoOrderByIdAsc(String estado);
    long countByEstado(String estado);

    // Alta sin chocar si otra pestaña/pedido la crea al mismo tiempo (testeo integral A3):
    // un error de clave única dentro de la transacción la dejaba rota → error 500.
    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query(value = "insert into geo_ubicacion (clave, direccion, estado, manual, actualizado_en) "
        + "values (:clave, :direccion, 'PENDIENTE', false, now()) on conflict (clave) do nothing", nativeQuery = true)
    int insertarSiFalta(@org.springframework.data.repository.query.Param("clave") String clave,
                        @org.springframework.data.repository.query.Param("direccion") String direccion);
}
