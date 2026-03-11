package com.dispenserlatienda.controller.servicio;

import com.dispenserlatienda.dto.servicio.ServicioCreateDTO;
import com.dispenserlatienda.dto.servicio.ServicioDTO;
import com.dispenserlatienda.repository.ServicioRepository;
import com.dispenserlatienda.service.servicio.ServicioService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;

/**
 * ServicioController
 * Gestiona servicios y presupuestos
 */
@RestController
@RequestMapping("/api/servicios")
@CrossOrigin(origins = "http://localhost:3000")
@Validated
public class ServicioController {
    private final ServicioService servicioService;
    private final ServicioRepository servicioRepository;

    public ServicioController(ServicioService servicioService,
                              ServicioRepository servicioRepository) {
        this.servicioService = servicioService;
        this.servicioRepository = servicioRepository;
    }

    // GET: Listar todos los servicios con paginación
    @GetMapping
    public ResponseEntity<Page<ServicioDTO>> listar(Pageable pageable) {
        return ResponseEntity.ok(servicioService.listarTodos(pageable));
    }

    // GET: Obtener servicio por ID
    @GetMapping("/{id}")
    public ResponseEntity<ServicioDTO> obtenerPorId(@PathVariable Long id) {
        return ResponseEntity.ok(servicioService.buscarPorId(id));
    }

    // POST: Crear servicio (JSON puro, sin FormData)
    @PostMapping
    public ResponseEntity<ServicioDTO> crear(@Valid @RequestBody ServicioCreateDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(servicioService.crearServicioCompleto(dto));
    }

    // PUT: Actualizar servicio (JSON puro, sin FormData)
    @PutMapping("/{id}")
    public ResponseEntity<ServicioDTO> actualizar(
            @PathVariable Long id,
            @Valid @RequestBody ServicioCreateDTO dto) {
        return ResponseEntity.ok(servicioService.actualizarServicio(id, dto));
    }

    // PATCH: Cambiar estado
    @PatchMapping("/{id}/estado")
    public ResponseEntity<ServicioDTO> cambiarEstado(
            @PathVariable Long id,
            @RequestBody java.util.Map<String, String> payload) {
        String nuevoEstado = payload.get("estado");
        return ResponseEntity.ok(servicioService.cambiarEstado(id, nuevoEstado));
    }

    // DELETE: Eliminar servicio
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void eliminar(@PathVariable Long id) {
        servicioRepository.deleteById(id);
    }
}