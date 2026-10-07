package com.dispenserlatienda.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

// Portal Empresa (7-oct-2026): la columna usuario.rol puede tener un CHECK
// viejo (ADMIN, TECNICO) creado por Hibernate; ddl-auto=update no lo actualiza
// y guardar un usuario EMPRESA fallaría. Se saca al arrancar.
@Component
public class RolEmpresaRunner implements ApplicationRunner {
    private static final Logger log = LoggerFactory.getLogger(RolEmpresaRunner.class);
    private final JdbcTemplate jdbc;

    public RolEmpresaRunner(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    @Override
    public void run(ApplicationArguments args) {
        try {
            jdbc.execute("ALTER TABLE usuario DROP CONSTRAINT IF EXISTS usuario_rol_check");
        } catch (Exception e) {
            log.warn("No se pudo actualizar el CHECK de usuario.rol: {}", e.getMessage());
        }
    }
}
