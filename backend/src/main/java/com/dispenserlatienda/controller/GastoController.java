package com.dispenserlatienda.controller;

import com.dispenserlatienda.domain.Gasto;
import com.dispenserlatienda.dto.gasto.GastoCreateDTO;
import com.dispenserlatienda.repository.GastoRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;

// Controlador para gestionar gastos
// Implementa paginación para el listado
@RestController
@RequestMapping("/api/gastos")
@Validated
public class GastoController {

    private final GastoRepository repository;

    public GastoController(GastoRepository repository) {
        this.repository = repository;
    }

    // CAMBIO: Ahora devuelve Page<Gasto> en lugar de List<Gasto>
    // Ejemplo: GET /api/gastos?page=0&size=20&sort=fecha,desc
    @GetMapping
    public ResponseEntity<Page<Gasto>> listar(Pageable pageable) {
        return ResponseEntity.ok(repository.findAll(pageable));
    }

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