package com.dispenserlatienda.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

// Al arrancar: completa con TOTAL el alcance del descuento de los servicios
// existentes (9-oct-2026). La columna la crea Hibernate (ddl-auto=update) vacía;
// el código ya lee null como TOTAL, esto deja además el dato explícito en la base.
// Es idempotente: si no hay nada en null, no hace nada.
@Component
public class DescuentoAlcanceRunner implements ApplicationRunner {
    private static final Logger log = LoggerFactory.getLogger(DescuentoAlcanceRunner.class);
    private final JdbcTemplate jdbc;

    public DescuentoAlcanceRunner(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    @Override
    public void run(ApplicationArguments args) {
        try {
            int n = jdbc.update("UPDATE servicio SET descuento_alcance = 'TOTAL' WHERE descuento_alcance IS NULL");
            if (n > 0) log.info("Alcance de descuento completado como TOTAL en {} servicios", n);
        } catch (Exception e) {
            log.warn("No se pudo completar el alcance de descuento: {}", e.getMessage());
        }
    }
}
