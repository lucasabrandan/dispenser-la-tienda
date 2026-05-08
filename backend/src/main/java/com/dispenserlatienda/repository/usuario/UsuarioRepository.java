package com.dispenserlatienda.repository.usuario;

import com.dispenserlatienda.domain.usuario.Usuario;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UsuarioRepository extends JpaRepository<Usuario, Long> {

    Optional<Usuario> findByUsername(String username);

    Optional<Usuario> findFirstByNombreContainingIgnoreCase(String nombre);
}
