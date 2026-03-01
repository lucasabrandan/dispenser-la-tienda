package com.dispenserlatienda.controller.servicio;

import com.dispenserlatienda.dto.servicio.ServicioCreateDTO;
import com.dispenserlatienda.dto.servicio.ServicioDTO;
import com.dispenserlatienda.repository.ServicioRepository;
import com.dispenserlatienda.service.servicio.ServicioService;
import com.dispenserlatienda.service.FileStorageService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/servicios")
@CrossOrigin(origins = "*")
public class ServicioController {
    private final ServicioService servicioService;
    private final ServicioRepository servicioRepository;
    private final FileStorageService fileStorageService;
    private final ObjectMapper objectMapper; // 👈 El "traductor" inyectado

    // Inyectamos todo por constructor. Spring se encarga de darnos el ObjectMapper profesional.
    public ServicioController(ServicioService servicioService,
                              ServicioRepository servicioRepository,
                              FileStorageService fileStorageService,
                              ObjectMapper objectMapper) {
        this.servicioService = servicioService;
        this.servicioRepository = servicioRepository;
        this.fileStorageService = fileStorageService;
        this.objectMapper = objectMapper;
    }

    @GetMapping
    public ResponseEntity<List<ServicioDTO>> listar() {
        return ResponseEntity.ok(servicioService.listarTodos());
    }

    // 🚀 Este es el método que Marcos usa al darle a "GUARDAR"
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ServicioDTO> crear(
            @RequestPart("servicio") String servicioJson,
            @RequestPart(value = "foto", required = false) MultipartFile foto) throws Exception {

        // ✅ Al usar el objectMapper inyectado, la fecha "2026-03-01" entra perfecta
        ServicioCreateDTO dto = objectMapper.readValue(servicioJson, ServicioCreateDTO.class);

        // Si Marcos sacó una foto del remito en papel, la guardamos
        if (foto != null && !foto.isEmpty()) {
            String nombreImagen = fileStorageService.guardarArchivo(foto);
            dto.setFotoRemito(nombreImagen);
        }

        return ResponseEntity.ok(servicioService.crearServicioCompleto(dto));
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