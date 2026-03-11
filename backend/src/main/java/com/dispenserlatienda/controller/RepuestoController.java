package com.dispenserlatienda.controller;

import com.dispenserlatienda.domain.Repuesto;
import com.dispenserlatienda.repository.RepuestoRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;

// Controlador para gestionar repuestos
// Implementa paginación para el listado
@RestController
@RequestMapping("/api/repuestos")
@CrossOrigin(origins = "http://localhost:3000")
@Validated
public class RepuestoController {

    private final RepuestoRepository repuestoRepository;

    public RepuestoController(RepuestoRepository repuestoRepository) {
        this.repuestoRepository = repuestoRepository;
    }

    // CAMBIO: Ahora devuelve Page<Repuesto> en lugar de List<Repuesto>
    // Ejemplo: GET /api/repuestos?page=0&size=20&sort=nombre,asc
    @GetMapping
    public ResponseEntity<Page<Repuesto>> listar(Pageable pageable) {
        return ResponseEntity.ok(repuestoRepository.findAll(pageable));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Repuesto crear(@Valid @RequestBody Repuesto repuesto) {
        if (repuesto.getStock() != null && repuesto.getStock() < 0) repuesto.setStock(0);
        return repuestoRepository.save(repuesto);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Repuesto> editar(@PathVariable Long id, @Valid @RequestBody Repuesto detalles) {
        return repuestoRepository.findById(id).map(repuesto -> {
            repuesto.setSku(detalles.getSku());
            repuesto.setNombre(detalles.getNombre());
            repuesto.setDescripcion(detalles.getDescripcion());
            repuesto.setCosto(detalles.getCosto());
            repuesto.setPorcentajeGanancia(detalles.getPorcentajeGanancia());
            repuesto.setPrecio(detalles.getPrecio());
            repuesto.setStock(detalles.getStock() < 0 ? 0 : detalles.getStock());
            repuesto.setImagen(detalles.getImagen());
            return ResponseEntity.ok(repuestoRepository.save(repuesto));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void eliminar(@PathVariable Long id) {
        repuestoRepository.deleteById(id);
    }
}