package com.dispenserlatienda.repository.cliente;

import com.dispenserlatienda.domain.cliente.Cliente;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ClienteRepository extends JpaRepository<Cliente, Long> {

    Optional<Cliente> findByCuilDni(String cuilDni);

    Optional<Cliente> findByNombreIgnoreCase(String nombre);
}
