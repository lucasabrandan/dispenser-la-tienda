package com.dispenserlatienda.controller;

import com.dispenserlatienda.domain.Gasto;
import com.dispenserlatienda.dto.gasto.GastoCreateDTO;
import com.dispenserlatienda.repository.GastoRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.util.List;

// Agrega @Validated para que Spring valide automáticamente los DTOs
@RestController
@RequestMapping("/api/gastos")
@Validated
public class GastoController {

    private final GastoRepository repository;

    public GastoController(GastoRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    public List<Gasto> listar() {
        return repository.findAll();
    }

    // Agrega @Valid para validar el DTO de entrada
    @PostMapping
    public ResponseEntity<Gasto> crear(@Valid @RequestBody GastoCreateDTO dto) {
        Gasto nuevoGasto = new Gasto(
                dto.descripcion(),
                dto.monto(),
                dto.fecha(),
                dto.categoria()
        );
        return ResponseEntity.ok(repository.save(nuevoGasto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable Long id) {
        repository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}