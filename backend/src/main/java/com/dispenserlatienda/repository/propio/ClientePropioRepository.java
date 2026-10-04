package com.dispenserlatienda.repository.propio;

import com.dispenserlatienda.domain.propio.ClientePropio;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface ClientePropioRepository extends JpaRepository<ClientePropio, Long> {
    List<ClientePropio> findByUsuarioIdOrderByNombreAsc(Long usuarioId);
    Optional<ClientePropio> findByIdAndUsuarioId(Long id, Long usuarioId);
}
