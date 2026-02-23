package com.dispenserlatienda.controller.servicio;

import com.dispenserlatienda.dto.servicio.ServicioCreateDTO;
import com.dispenserlatienda.dto.servicio.ServicioDTO;
import com.dispenserlatienda.repository.ServicioRepository;
import com.dispenserlatienda.service.servicio.ServicioService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/servicios")
@CrossOrigin(origins = "*")
public class ServicioController {
    private final ServicioService servicioService;
    private final ServicioRepository servicioRepository;

    public ServicioController(ServicioService servicioService, ServicioRepository servicioRepository) {
        this.servicioService = servicioService;
        this.servicioRepository = servicioRepository;
    }

    @GetMapping
    public ResponseEntity<List<ServicioDTO>> listar() {
        return ResponseEntity.ok(servicioService.listarTodos());
    }

    @PostMapping
    public ResponseEntity<ServicioDTO> crear(@RequestBody @Valid ServicioCreateDTO dto) {
        return ResponseEntity.ok(servicioService.crearServicioCompleto(dto));
    }

    // 💡 ACÁ ESTÁ LA SOLUCIÓN: Usamos Map<String, String> para leer el JSON { "estado": "VENTA" }
    @PatchMapping("/{id}/estado")
    public ResponseEntity<ServicioDTO> cambiarEstado(@PathVariable Long id, @RequestBody Map<String, String> payload) {
        String nuevoEstado = payload.get("estado");
        return ResponseEntity.ok(servicioService.cambiarEstado(id, nuevoEstado));
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void eliminar(@PathVariable Long id) {
        servicioRepository.deleteById(id);
    }
}