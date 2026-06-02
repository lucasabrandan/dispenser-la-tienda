package com.dispenserlatienda.controller.orden;

import com.dispenserlatienda.dto.orden.NotaAgendaDTO;
import com.dispenserlatienda.service.orden.NotaAgendaService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/notas-agenda")
public class NotaAgendaController {

    private final NotaAgendaService service;

    public NotaAgendaController(NotaAgendaService service) {
        this.service = service;
    }

    @GetMapping("/all")
    public ResponseEntity<List<NotaAgendaDTO>> listarTodas(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta) {
        return ResponseEntity.ok(service.listarTodas(desde, hasta));
    }

    @GetMapping("/{tecnicoId}")
    public ResponseEntity<List<NotaAgendaDTO>> listar(
            @PathVariable Long tecnicoId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta) {
        return ResponseEntity.ok(service.listarPorTecnico(tecnicoId, desde, hasta));
    }

    @PostMapping
    public ResponseEntity<NotaAgendaDTO> crear(@RequestBody NotaAgendaDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.crear(dto));
    }

    @PatchMapping("/{id}/toggle")
    public ResponseEntity<NotaAgendaDTO> toggle(@PathVariable Long id) {
        return ResponseEntity.ok(service.toggleCompletada(id));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable Long id) {
        service.eliminar(id);
        return ResponseEntity.noContent().build();
    }
}
