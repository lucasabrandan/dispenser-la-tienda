package com.dispenserlatienda.controller.servicio;

import com.dispenserlatienda.dto.servicio.ServicioCreateDTO;
import com.dispenserlatienda.dto.servicio.ServicioDTO;
import com.dispenserlatienda.service.servicio.ServicioService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/servicios")
@CrossOrigin(origins = "*")
public class ServicioController {
    private final ServicioService servicioService;
    public ServicioController(ServicioService servicioService) { this.servicioService = servicioService; }

    @GetMapping
    public ResponseEntity<List<ServicioDTO>> listar() {
        return ResponseEntity.ok(servicioService.listarTodos());
    }

    @PostMapping
    public ResponseEntity<ServicioDTO> crear(@RequestBody @Valid ServicioCreateDTO dto) {
        return ResponseEntity.ok(servicioService.crearServicioCompleto(dto));
    }
}