package com.dispenserlatienda.repository;

import com.dispenserlatienda.domain.Cliente;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ClienteRepository extends JpaRepository<Cliente, Long> {

    Optional<Cliente> findByCuilDni(String cuilDni);

}
