package com.dispenserlatienda.controller;

import com.dispenserlatienda.domain.Sede;
import com.dispenserlatienda.dto.sede.SedeCreateDTO;
import com.dispenserlatienda.dto.sede.SedeDTO;
import com.dispenserlatienda.repository.SedeRepository;
import com.dispenserlatienda.service.SedeService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/sedes")
@CrossOrigin(origins = "http://localhost:3000") // 🛡️ Permite que React entre sin problemas
public class SedeController {

    private final SedeService sedeService;
    private final SedeRepository sedeRepository; // Necesario para listar todas

    public SedeController(SedeService sedeService, SedeRepository sedeRepository) {
        this.sedeService = sedeService;
        this.sedeRepository = sedeRepository;
    }

    // ✅ MÉTODO NUEVO: Listar todas las sedes (Lo que pide el desplegable de React)
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
    public SedeDTO crear(@RequestBody SedeCreateDTO dto) {
        return sedeService.crear(dto);
    }
}