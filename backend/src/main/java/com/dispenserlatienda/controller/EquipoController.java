package com.dispenserlatienda.controller;

import com.dispenserlatienda.domain.Equipo;
import com.dispenserlatienda.dto.equipo.EquipoCreateDTO;
import com.dispenserlatienda.dto.equipo.EquipoSugerenciaDTO;
import com.dispenserlatienda.dto.equipo.GarantiaStatusDTO;
import com.dispenserlatienda.service.EquipoService;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.util.List;

// Agrega @Validated para que Spring valide automáticamente los DTOs
@RestController
@RequestMapping("/api/equipos")
@CrossOrigin(origins = "http://localhost:3000")
@Validated
public class EquipoController {

    private final EquipoService equipoService;

    public EquipoController(EquipoService equipoService) {
        this.equipoService = equipoService;
    }

    @GetMapping
    public List<Equipo> listar() {
        return equipoService.listarTodos();
    }

    // Agrega @Valid para validar el DTO de entrada
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Equipo crear(@Valid @RequestBody EquipoCreateDTO dto) {
        return equipoService.crear(dto);
    }

    // Agrega @Valid para validar el DTO de entrada
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