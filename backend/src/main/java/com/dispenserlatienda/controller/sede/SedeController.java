package com.dispenserlatienda.controller.sede;

import com.dispenserlatienda.domain.sede.Sede;
import com.dispenserlatienda.dto.sede.SedeCreateDTO;
import com.dispenserlatienda.dto.sede.SedeDTO;
import com.dispenserlatienda.repository.sede.SedeRepository;
import com.dispenserlatienda.service.sede.SedeService;
import com.dispenserlatienda.service.seguridad.TecnicoAccesoService;
import com.dispenserlatienda.repository.usuario.UsuarioRepository;
import org.springframework.security.core.Authentication;
import org.springframework.http.HttpStatus;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.util.List;

@RestController
@RequestMapping("/api/sedes")
@Validated
public class SedeController {

    private final SedeService sedeService;
    private final SedeRepository sedeRepository;
    private final TecnicoAccesoService acceso;
    private final UsuarioRepository usuarioRepo;

    public SedeController(SedeService sedeService, SedeRepository sedeRepository,
                          TecnicoAccesoService acceso, UsuarioRepository usuarioRepo) {
        this.sedeService = sedeService;
        this.sedeRepository = sedeRepository;
        this.acceso = acceso;
        this.usuarioRepo = usuarioRepo;
    }

    @GetMapping
    public List<Sede> listarTodas() {
        return sedeRepository.findAll();
    }

    @GetMapping("/mostrador")
    public List<SedeDTO> mostrador() {
        return sedeService.mostrador();
    }

    @GetMapping("/cliente/{clienteId}")
    public List<SedeDTO> listarPorCliente(@PathVariable Long clienteId, Authentication auth) {
        // Técnico: solo clientes de sus visitas abiertas (7-oct-2026)
        acceso.exigirCliente(usuarioRepo.findByUsername(auth.getName()).orElseThrow(), clienteId);
        return sedeService.listarPorCliente(clienteId);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public SedeDTO crear(@Valid @RequestBody SedeCreateDTO dto, Authentication auth) {
        acceso.exigirCliente(usuarioRepo.findByUsername(auth.getName()).orElseThrow(), dto.clienteId());
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