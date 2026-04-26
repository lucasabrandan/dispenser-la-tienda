package com.dispenserlatienda.controller.equipo;

import com.dispenserlatienda.domain.equipo.Equipo;
import com.dispenserlatienda.dto.equipo.EquipoCreateDTO;
import com.dispenserlatienda.dto.equipo.EquipoDTO;
import com.dispenserlatienda.service.equipo.EquipoService;
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
@Validated
public class EquipoController {

    private final EquipoService equipoService;

    public EquipoController(EquipoService equipoService) {
        this.equipoService = equipoService;
    }

    @GetMapping
    public ResponseEntity<Page<EquipoDTO>> listar(Pageable pageable) {
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

    // Archivar (soft delete) — el historial se preserva
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void archivar(@PathVariable Long id) {
        equipoService.archivar(id);
    }

    // Eliminar definitivo — borra todo el historial
    @DeleteMapping("/{id}/definitivo")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void eliminarDefinitivo(@PathVariable Long id) {
        equipoService.eliminarDefinitivo(id);
    }

    // Restaurar equipo archivado
    @PatchMapping("/{id}/restaurar")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void restaurar(@PathVariable Long id) {
        equipoService.restaurar(id);
    }
}