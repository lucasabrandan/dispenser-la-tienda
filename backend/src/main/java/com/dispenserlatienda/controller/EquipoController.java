package com.dispenserlatienda.controller;

import com.dispenserlatienda.domain.Equipo;
import com.dispenserlatienda.dto.equipo.EquipoCreateDTO;
import com.dispenserlatienda.dto.equipo.EquipoSugerenciaDTO;
import com.dispenserlatienda.dto.equipo.GarantiaStatusDTO;
import com.dispenserlatienda.service.EquipoService;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/equipos")
@CrossOrigin(origins = "http://localhost:3000")
public class EquipoController {

    private final EquipoService equipoService; // ✅ Solo inyectamos el Service

    public EquipoController(EquipoService equipoService) {
        this.equipoService = equipoService;
    }

    @GetMapping
    public List<Equipo> listar() {
        return equipoService.listarTodos();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Equipo crear(@RequestBody EquipoCreateDTO dto) {
        return equipoService.crear(dto);
    }

    @PutMapping("/{id}")
    public Equipo editar(@PathVariable Long id, @RequestBody EquipoCreateDTO dto) {
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

    // Los métodos de sugerencias y garantía también podrían ir al Service
    // pero para este commit, con esto ya limpiaste el 80% del ruido.
}