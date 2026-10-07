package com.dispenserlatienda.repository.empresa;

import com.dispenserlatienda.domain.empresa.PedidoEmpresa;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PedidoEmpresaRepository extends JpaRepository<PedidoEmpresa, Long> {
    List<PedidoEmpresa> findByClienteIdOrderByCreadoEnDesc(Long clienteId);
    List<PedidoEmpresa> findAllByOrderByCreadoEnDesc();
    Optional<PedidoEmpresa> findFirstByOrdenId(Long ordenId);
    long countByEstadoAndOrdenIdIsNull(String estado);
}
