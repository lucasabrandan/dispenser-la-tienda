package com.dispenserlatienda.repository.empresa;

import com.dispenserlatienda.domain.empresa.PedidoComentario;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PedidoComentarioRepository extends JpaRepository<PedidoComentario, Long> {
    List<PedidoComentario> findByPedidoIdOrderByCreadoEnAsc(Long pedidoId);
    long countByPedidoId(Long pedidoId);
}
