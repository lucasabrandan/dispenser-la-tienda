package com.dispenserlatienda.controller;

import com.dispenserlatienda.domain.Equipo;
import com.dispenserlatienda.dto.equipo.EquipoCreateDTO;
import com.dispenserlatienda.service.EquipoService;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;

// Controlador para gestionar equipos/dispensers
// Implementa paginación para mejorar performance
@RestController
@RequestMapping("/api/equipos")
@CrossOrigin(origins = "http://localhost:3000")
@Validated
public class EquipoController {

    private final EquipoService equipoService;

    public EquipoController(EquipoService equipoService) {
        this.equipoService = equipoService;
    }

    // CAMBIO: Ahora devuelve Page<Equipo> en lugar de List<Equipo>
    // Parámetros: page=0 (primera página), size=20 (20 elementos)
    // Ejemplo: GET /api/equipos?page=0&size=20
    @GetMapping
    public ResponseEntity<Page<Equipo>> listar(Pageable pageable) {
        return ResponseEntity.ok(equipoService.listarTodos(pageable));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Equipo crear(@Valid @RequestBody EquipoCreateDTO dto) {
        return equipoService.crear(dto);
    }

    @PutMapping("/{id}")
    public Equipo editar(@PathVariable Long id, @Valid @RequestBody EquipoCreateDTO dto) {
        return equipoService.actualizar(id, dto);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> eliminar(@PathVariable Long id) {
        try {
            equipoService.eliminar(id);
            return ResponseEntity.noContent().build();
        } catch (DataIntegrityViolationException e) {
            return ResponseEntity.badRequest().body("No se puede eliminar el dispenser porque ya tiene historial asociado.");
        }
    }
}