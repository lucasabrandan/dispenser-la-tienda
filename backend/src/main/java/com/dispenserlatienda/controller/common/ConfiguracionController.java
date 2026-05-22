package com.dispenserlatienda.controller.common;

import com.dispenserlatienda.domain.common.ConfiguracionGlobal;
import com.dispenserlatienda.repository.common.ConfiguracionGlobalRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/configuracion")
public class ConfiguracionController {

    private final ConfiguracionGlobalRepository repo;

    public ConfiguracionController(ConfiguracionGlobalRepository repo) {
        this.repo = repo;
    }

    @GetMapping
    public ResponseEntity<ConfiguracionGlobal> obtener() {
        ConfiguracionGlobal config = repo.findById(1L)
                .orElseGet(() -> repo.save(new ConfiguracionGlobal()));
        return ResponseEntity.ok(config);
    }

    @PutMapping
    public ResponseEntity<ConfiguracionGlobal> actualizar(@RequestBody ConfiguracionGlobal dto) {
        ConfiguracionGlobal config = repo.findById(1L)
                .orElseGet(ConfiguracionGlobal::new);
        config.setId(1L);
        if (dto.getManoDeObraBase() != null) config.setManoDeObraBase(dto.getManoDeObraBase());
        if (dto.getPorcentajeImpuestos() != null) config.setPorcentajeImpuestos(dto.getPorcentajeImpuestos());
        if (dto.getDescuentoEfectivo() != null) config.setDescuentoEfectivo(dto.getDescuentoEfectivo());
        if (dto.getPorcentajeIVA() != null) config.setPorcentajeIVA(dto.getPorcentajeIVA());
        return ResponseEntity.ok(repo.save(config));
    }
}
