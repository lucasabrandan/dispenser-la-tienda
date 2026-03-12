package com.dispenserlatienda.controller;

import com.dispenserlatienda.dto.gasto.GastoCreateDTO;
import com.dispenserlatienda.dto.gasto.GastoDTO;
import com.dispenserlatienda.service.gasto.GastoService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.util.List;

/**
 * GastoController
 * Gestiona gastos operacionales
 */
@RestController
@RequestMapping("/api/gastos")
@CrossOrigin(origins = "http://localhost:3000")
@Validated
public class GastoController {

    private final GastoService gastoService;

    public GastoController(GastoService gastoService) {
        this.gastoService = gastoService;
    }

    // GET: Listar todos los gastos con paginación
    @GetMapping
    public ResponseEntity<Page<GastoDTO>> listar(Pageable pageable) {
        return ResponseEntity.ok(gastoService.listarTodos(pageable));
    }

    // GET: Obtener gasto por ID
    @GetMapping("/{id}")
    public ResponseEntity<GastoDTO> obtenerPorId(@PathVariable Long id) {
        return ResponseEntity.ok(gastoService.buscarPorId(id));
    }

    // GET: Gastos del mes (para dashboard financiero)
    // Ejemplo: GET /api/gastos/mes?mes=2026-03
    @GetMapping("/mes")
    public ResponseEntity<List<GastoDTO>> gastosPorMes(@RequestParam String mes) {
        return ResponseEntity.ok(gastoService.gastosPorMes(mes));
    }

    // POST: Crear gasto
    @PostMapping
    public ResponseEntity<GastoDTO> crear(@Valid @RequestBody GastoCreateDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(gastoService.crear(dto));
    }

    // DELETE: Eliminar gasto
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void eliminar(@PathVariable Long id) {
        gastoService.eliminar(id);
    }
}