package com.dispenserlatienda.repository.usuario;

import com.dispenserlatienda.domain.usuario.RolUsuario;
import com.dispenserlatienda.domain.usuario.Usuario;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UsuarioRepository extends JpaRepository<Usuario, Long> {

    Optional<Usuario> findByUsername(String username);

    Optional<Usuario> findFirstByNombreContainingIgnoreCase(String nombre);

    long countByRolAndActivoTrue(RolUsuario rol);

    List<Usuario> findByRolAndActivoTrue(RolUsuario rol);
}
