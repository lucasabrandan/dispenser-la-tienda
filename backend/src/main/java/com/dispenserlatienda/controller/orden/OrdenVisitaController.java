package com.dispenserlatienda.controller.orden;

import com.dispenserlatienda.dto.orden.OrdenAvanceDTO;
import com.dispenserlatienda.dto.orden.OrdenVisitaCreateDTO;
import com.dispenserlatienda.dto.orden.OrdenVisitaDTO;
import com.dispenserlatienda.service.orden.OrdenVisitaService;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/ordenes")
public class OrdenVisitaController {

    private final OrdenVisitaService service;

    public OrdenVisitaController(OrdenVisitaService service) {
        this.service = service;
    }

    // Admin: listar todas con rango opcional
    @GetMapping
    public ResponseEntity<List<OrdenVisitaDTO>> listar(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta) {
        return ResponseEntity.ok(service.listarTodas(desde, hasta));
    }

    // Técnico: mis órdenes activas
    @GetMapping("/mias/{tecnicoId}")
    public ResponseEntity<List<OrdenVisitaDTO>> mias(@PathVariable Long tecnicoId) {
        return ResponseEntity.ok(service.listarPorTecnico(tecnicoId));
    }

    // Técnico: historial completo
    @GetMapping("/historial/{tecnicoId}")
    public ResponseEntity<List<OrdenVisitaDTO>> historial(@PathVariable Long tecnicoId) {
        return ResponseEntity.ok(service.listarHistorialTecnico(tecnicoId));
    }

    // Admin: crear
    @PostMapping
    public ResponseEntity<OrdenVisitaDTO> crear(@Valid @RequestBody OrdenVisitaCreateDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.crear(dto));
    }

    // Admin: editar
    @PutMapping("/{id}")
    public ResponseEntity<OrdenVisitaDTO> actualizar(@PathVariable Long id,
                                                      @Valid @RequestBody OrdenVisitaCreateDTO dto) {
        return ResponseEntity.ok(service.actualizar(id, dto));
    }

    // Admin: eliminar
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable Long id) {
        service.eliminar(id);
        return ResponseEntity.noContent().build();
    }

    // Técnico/Admin: avanzar estado
    @PatchMapping("/{id}/estado")
    public ResponseEntity<OrdenVisitaDTO> avanzar(@PathVariable Long id,
                                                   @RequestBody OrdenAvanceDTO dto) {
        return ResponseEntity.ok(service.avanzarEstado(id, dto));
    }

    // Badge: count activas totales (admin) o por técnico
    @GetMapping("/count-activas")
    public ResponseEntity<Map<String, Long>> countActivas(
            @RequestParam(required = false) Long tecnicoId) {
        long count = tecnicoId != null
            ? service.countActivasTecnico(tecnicoId)
            : service.countActivas();
        return ResponseEntity.ok(Map.of("count", count));
    }

    // Lista de técnicos disponibles para el form de creación
    @GetMapping("/tecnicos")
    public ResponseEntity<List<Map<String, Object>>> tecnicos() {
        List<Map<String, Object>> result = service.listarTecnicos().stream()
            .map(u -> Map.<String, Object>of("id", u.getId(), "nombre", u.getNombre()))
            .toList();
        return ResponseEntity.ok(result);
    }
}
