package com.dispenserlatienda.controller;

import com.dispenserlatienda.domain.Sede;
import com.dispenserlatienda.dto.sede.SedeCreateDTO;
import com.dispenserlatienda.dto.sede.SedeDTO;
import com.dispenserlatienda.repository.SedeRepository;
import com.dispenserlatienda.service.SedeService;
import org.springframework.http.HttpStatus;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.util.List;

// Agrega @Validated para que Spring valide automáticamente los DTOs
// CAMBIO: Cambiar @CrossOrigin(origins = "http://localhost:3000") a configurable
@RestController
@RequestMapping("/api/sedes")
@CrossOrigin(origins = "http://localhost:3000")
@Validated
public class SedeController {

    private final SedeService sedeService;
    private final SedeRepository sedeRepository;

    public SedeController(SedeService sedeService, SedeRepository sedeRepository) {
        this.sedeService = sedeService;
        this.sedeRepository = sedeRepository;
    }

    // Listar todas las sedes (para desplegables en React)
    @GetMapping
    public List<Sede> listarTodas() {
        return sedeRepository.findAll();
    }

    // Listar sedes de un cliente específico
    @GetMapping("/cliente/{clienteId}")
    public List<SedeDTO> listarPorCliente(@PathVariable Long clienteId) {
        return sedeService.listarPorCliente(clienteId);
    }

    // Agrega @Valid para validar el DTO de entrada
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public SedeDTO crear(@Valid @RequestBody SedeCreateDTO dto) {
        return sedeService.crear(dto);
    }
}