package com.dispenserlatienda.controller;

import com.dispenserlatienda.domain.Repuesto;
import com.dispenserlatienda.repository.RepuestoRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/repuestos")
@CrossOrigin(origins = "*")
public class RepuestoController {

    private final RepuestoRepository repuestoRepository;

    public RepuestoController(RepuestoRepository repuestoRepository) {
        this.repuestoRepository = repuestoRepository;
    }

    @GetMapping
    public List<Repuesto> listar() {
        return repuestoRepository.findAll();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Repuesto crear(@RequestBody Repuesto repuesto) {
        // Validación de seguridad en el backend para que no pasen negativos
        if (repuesto.getStock() != null && repuesto.getStock() < 0) repuesto.setStock(0);
        return repuestoRepository.save(repuesto);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Repuesto> editar(@PathVariable Long id, @RequestBody Repuesto detalles) {
        return repuestoRepository.findById(id).map(repuesto -> {
            repuesto.setSku(detalles.getSku());
            repuesto.setNombre(detalles.getNombre());
            repuesto.setDescripcion(detalles.getDescripcion());
            repuesto.setCosto(detalles.getCosto());
            repuesto.setPorcentajeGanancia(detalles.getPorcentajeGanancia());
            repuesto.setPrecio(detalles.getPrecio());

            // Validación anti-negativos
            repuesto.setStock(detalles.getStock() < 0 ? 0 : detalles.getStock());

            // 💡 NUEVO: Guardar la imagen al editar
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