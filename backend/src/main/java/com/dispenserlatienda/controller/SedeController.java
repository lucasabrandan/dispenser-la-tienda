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

    @GetMapping
    public List<Sede> listarTodas() {
        return sedeRepository.findAll();
    }

    @GetMapping("/cliente/{clienteId}")
    public List<SedeDTO> listarPorCliente(@PathVariable Long clienteId) {
        return sedeService.listarPorCliente(clienteId);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public SedeDTO crear(@Valid @RequestBody SedeCreateDTO dto) {
        return sedeService.crear(dto);
    }

    // Archivar (soft delete) — el historial se preserva
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void archivar(@PathVariable Long id) {
        sedeService.archivar(id);
    }

    // Eliminar definitivo — borra todo el historial
    @DeleteMapping("/{id}/definitivo")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void eliminarDefinitivo(@PathVariable Long id) {
        sedeService.eliminarDefinitivo(id);
    }
}