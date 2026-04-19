package com.dispenserlatienda.config;

import com.dispenserlatienda.domain.usuario.RolUsuario;
import com.dispenserlatienda.domain.usuario.Usuario;
import com.dispenserlatienda.repository.usuario.UsuarioRepository;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

/**
 * Crea los usuarios iniciales si la tabla está vacía.
 * Cambiar las contraseñas después del primer deploy.
 */
@Configuration
public class DataInitializer {

    @Bean
    ApplicationRunner inicializarUsuarios(UsuarioRepository repo, PasswordEncoder encoder) {
        return args -> {
            if (repo.count() == 0) {
                repo.save(new Usuario("Administrador", "admin", encoder.encode("admin123"), RolUsuario.ADMIN));
                repo.save(new Usuario("Técnico", "tecnico", encoder.encode("tecnico123"), RolUsuario.TECNICO));
                System.out.println("[DataInitializer] Usuarios creados — admin / tecnico");
            }
        };
    }
}
