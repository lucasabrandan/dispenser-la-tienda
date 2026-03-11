package com.dispenserlatienda.controller;

import com.dispenserlatienda.domain.Repuesto;
import com.dispenserlatienda.repository.RepuestoRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.util.List;

// Agrega @Validated para que Spring valide automáticamente los DTOs
// CAMBIO: Cambiar @CrossOrigin(origins = "*") a dominio específico
@RestController
@RequestMapping("/api/repuestos")
@CrossOrigin(origins = "http://localhost:3000")
@Validated
public class RepuestoController {

    private final RepuestoRepository repuestoRepository;

    public RepuestoController(RepuestoRepository repuestoRepository) {
        this.repuestoRepository = repuestoRepository;
    }

    @GetMapping
    public List<Repuesto> listar() {
        return repuestoRepository.findAll();
    }

    // Agrega @Valid para validar el DTO de entrada
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Repuesto crear(@Valid @RequestBody Repuesto repuesto) {
        // Validación de seguridad en el backend para que no pasen negativos
        if (repuesto.getStock() != null && repuesto.getStock() < 0) repuesto.setStock(0);
        return repuestoRepository.save(repuesto);
    }

    // Agrega @Valid para validar el DTO de entrada
    @PutMapping("/{id}")
    public ResponseEntity<Repuesto> editar(@PathVariable Long id, @Valid @RequestBody Repuesto detalles) {
        return repuestoRepository.findById(id).map(repuesto -> {
            repuesto.setSku(detalles.getSku());
            repuesto.setNombre(detalles.getNombre());
            repuesto.setDescripcion(detalles.getDescripcion());
            repuesto.setCosto(detalles.getCosto());
            repuesto.setPorcentajeGanancia(detalles.getPorcentajeGanancia());
            repuesto.setPrecio(detalles.getPrecio());

            // Validación anti-negativos
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