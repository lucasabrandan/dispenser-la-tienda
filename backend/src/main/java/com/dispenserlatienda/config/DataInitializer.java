package com.dispenserlatienda.config;

import com.dispenserlatienda.domain.usuario.RolUsuario;
import com.dispenserlatienda.domain.usuario.Usuario;
import com.dispenserlatienda.repository.usuario.UsuarioRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.security.SecureRandom;

/**
 * Crea el primer usuario admin SOLO si no hay ningún usuario en la base (instalación nueva).
 * La clave sale de la propiedad app.init.admin-password (o variable INIT_ADMIN_PASSWORD);
 * si no está, se genera una al azar y se muestra una sola vez en el log.
 * Nunca recrea usuarios borrados ni crea un técnico de fábrica.
 */
@Configuration
public class DataInitializer {

    @Bean
    ApplicationRunner inicializarUsuarios(UsuarioRepository repo, PasswordEncoder encoder,
                                          @Value("${app.init.admin-password:${INIT_ADMIN_PASSWORD:}}") String clave) {
        return args -> {
            if (repo.count() > 0) return;
            String pass = (clave == null || clave.isBlank()) ? generar() : clave;
            repo.save(new Usuario("Administrador", "admin", encoder.encode(pass), RolUsuario.ADMIN));
            System.out.println("[DataInitializer] Base vacía: usuario 'admin' creado"
                    + ((clave == null || clave.isBlank()) ? " con clave temporal: " + pass + " (cambiala al entrar)" : ""));
        };
    }

    private static String generar() {
        String abc = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        SecureRandom r = new SecureRandom();
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < 14; i++) sb.append(abc.charAt(r.nextInt(abc.length())));
        return sb.toString();
    }
}
