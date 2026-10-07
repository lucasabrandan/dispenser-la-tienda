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
}
