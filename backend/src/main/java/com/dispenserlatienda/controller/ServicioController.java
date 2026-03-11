package com.dispenserlatienda.controller.servicio;

import com.dispenserlatienda.dto.servicio.ServicioCreateDTO;
import com.dispenserlatienda.dto.servicio.ServicioDTO;
import com.dispenserlatienda.repository.ServicioRepository;
import com.dispenserlatienda.service.servicio.ServicioService;
import com.dispenserlatienda.service.FileStorageService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import jakarta.validation.Valid;
import java.util.Map;

// Controlador para gestionar servicios y presupuestos
// Implementa paginación para el listado de servicios
@RestController
@RequestMapping("/api/servicios")
@CrossOrigin(origins = "http://localhost:3000")
@Validated
public class ServicioController {
    private final ServicioService servicioService;
    private final ServicioRepository servicioRepository;
    private final FileStorageService fileStorageService;
    private final ObjectMapper objectMapper;

    public ServicioController(ServicioService servicioService,
                              ServicioRepository servicioRepository,
                              FileStorageService fileStorageService,
                              ObjectMapper objectMapper) {
        this.servicioService = servicioService;
        this.servicioRepository = servicioRepository;
        this.fileStorageService = fileStorageService;
        this.objectMapper = objectMapper;
    }

    // CAMBIO: Ahora devuelve Page<ServicioDTO> en lugar de List<ServicioDTO>
    // Ejemplo: GET /api/servicios?page=0&size=20&sort=fechaServicio,desc
    @GetMapping
    public ResponseEntity<Page<ServicioDTO>> listar(Pageable pageable) {
        return ResponseEntity.ok(servicioService.listarTodos(pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ServicioDTO> obtenerPorId(@PathVariable Long id) {
        return ResponseEntity.ok(servicioService.buscarPorId(id));
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ServicioDTO> crear(
            @RequestPart("servicio") String servicioJson,
            @RequestPart(value = "foto", required = false) MultipartFile foto) throws Exception {

        ServicioCreateDTO dto = objectMapper.readValue(servicioJson, ServicioCreateDTO.class);

        if (foto != null && !foto.isEmpty()) {
            String nombreImagen = fileStorageService.guardarArchivo(foto);
            dto.setFotoRemito(nombreImagen);
        }

        return ResponseEntity.ok(servicioService.crearServicioCompleto(dto));
    }

    @PutMapping(value = "/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ServicioDTO> actualizar(
            @PathVariable Long id,
            @RequestPart("servicio") String servicioJson,
            @RequestPart(value = "foto", required = false) MultipartFile foto) throws Exception {

        ServicioCreateDTO dto = objectMapper.readValue(servicioJson, ServicioCreateDTO.class);

        if (foto != null && !foto.isEmpty()) {
            String nombreImagen = fileStorageService.guardarArchivo(foto);
            dto.setFotoRemito(nombreImagen);
        }

        return ResponseEntity.ok(servicioService.actualizarServicio(id, dto));
    }

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