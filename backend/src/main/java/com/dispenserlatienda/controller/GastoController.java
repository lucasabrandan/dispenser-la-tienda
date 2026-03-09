package com.dispenserlatienda.controller;

import com.dispenserlatienda.domain.Gasto;
import com.dispenserlatienda.dto.GastoCreateDTO;
import com.dispenserlatienda.repository.GastoRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/gastos")
public class GastoController {

    private final GastoRepository repository;

    public GastoController(GastoRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    public List<Gasto> listar() {
        return repository.findAll();
    }

    @PostMapping
    public ResponseEntity<Gasto> crear(@RequestBody GastoCreateDTO dto) {
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