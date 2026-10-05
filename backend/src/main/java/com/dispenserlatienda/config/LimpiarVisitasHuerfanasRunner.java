package com.dispenserlatienda.config;

import com.dispenserlatienda.repository.orden.OrdenVisitaRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

// Al arrancar el servidor (5-oct-2026): borra las visitas cuyo trabajo ya no
// existe (quedaron de trabajos eliminados antes de que se borraran juntos).
@Component
public class LimpiarVisitasHuerfanasRunner implements ApplicationRunner {
    private static final Logger log = LoggerFactory.getLogger(LimpiarVisitasHuerfanasRunner.class);
    private final OrdenVisitaRepository repo;

    public LimpiarVisitasHuerfanasRunner(OrdenVisitaRepository repo) { this.repo = repo; }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        try {
            int n = repo.borrarHuerfanas();
            if (n > 0) log.info("Visitas sin trabajo borradas: {}", n);
        } catch (Exception e) {
            log.warn("No se pudieron limpiar las visitas sin trabajo: {}", e.getMessage());
        }
    }
}
