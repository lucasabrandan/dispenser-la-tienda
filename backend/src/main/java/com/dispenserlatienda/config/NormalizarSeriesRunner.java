package com.dispenserlatienda.config;

import com.dispenserlatienda.domain.equipo.Equipo;
import com.dispenserlatienda.repository.equipo.EquipoRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

// Al arrancar el servidor: deja los N/S existentes sin espacios y en mayúsculas
// (5-oct-2026). Si al limpiarlo choca con otro equipo que ya tiene ese N/S, no lo
// toca y lo deja en el log para revisarlo a mano.
@Component
public class NormalizarSeriesRunner implements ApplicationRunner {
    private static final Logger log = LoggerFactory.getLogger(NormalizarSeriesRunner.class);
    private final EquipoRepository repo;

    public NormalizarSeriesRunner(EquipoRepository repo) { this.repo = repo; }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        try {
            List<Equipo> todos = repo.findAll();
            Set<String> usados = new HashSet<>();
            for (Equipo e : todos) if (e.getNumeroSerie() != null) usados.add(e.getNumeroSerie());
            int cambiados = 0;
            for (Equipo e : todos) {
                String actual = e.getNumeroSerie();
                if (actual == null) continue;
                String limpio = Equipo.normalizarSerie(actual);
                if (limpio == null || limpio.equals(actual)) continue;
                if (usados.contains(limpio)) {
                    log.warn("N/S '{}' (equipo {}) no se normalizó: ya existe '{}'", actual, e.getId(), limpio);
                    continue;
                }
                usados.remove(actual); usados.add(limpio);
                e.setNumeroSerie(limpio);
                cambiados++;
            }
            if (cambiados > 0) { repo.saveAll(todos); log.info("N/S normalizados: {}", cambiados); }
        } catch (Exception ex) {
            log.warn("No se pudieron normalizar los N/S: {}", ex.getMessage());
        }
    }
}
