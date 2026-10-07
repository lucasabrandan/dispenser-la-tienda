package com.dispenserlatienda.controller.equipo;

import com.dispenserlatienda.domain.equipo.Equipo;
import com.dispenserlatienda.dto.equipo.EquipoCreateDTO;
import com.dispenserlatienda.dto.equipo.EquipoDTO;
import com.dispenserlatienda.service.equipo.EquipoService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;

// Controlador para gestionar equipos/dispensers
// Implementa paginación para mejorar performance
@RestController
@RequestMapping("/api/equipos")
@Validated
public class EquipoController {

    private final EquipoService equipoService;

    private final com.dispenserlatienda.service.seguridad.TecnicoAccesoService acceso;
    private final com.dispenserlatienda.repository.usuario.UsuarioRepository usuarioRepo;

    public EquipoController(EquipoService equipoService,
                            com.dispenserlatienda.service.seguridad.TecnicoAccesoService acceso,
                            com.dispenserlatienda.repository.usuario.UsuarioRepository usuarioRepo) {
        this.equipoService = equipoService;
        this.acceso = acceso;
        this.usuarioRepo = usuarioRepo;
    }

    @GetMapping
    public ResponseEntity<Page<EquipoDTO>> listar(Pageable pageable) {
        return ResponseEntity.ok(equipoService.listarTodos(pageable));
    }

    // GET /api/equipos/siguiente-serie?base=MS290926&ocupados=MS290926A,MS290926B
    @GetMapping("/siguiente-serie")
    public java.util.Map<String, String> siguienteSerie(@RequestParam String base,
                                                        @RequestParam(required = false) java.util.List<String> ocupados) {
        return java.util.Map.of("serie", equipoService.siguienteSerie(base, ocupados));
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Equipo crear(@Valid @RequestBody EquipoCreateDTO dto, org.springframework.security.core.Authentication auth) {
        // Técnico: solo en lugares de clientes de sus visitas abiertas (7-oct-2026)
        acceso.exigirSede(usuarioRepo.findByUsername(auth.getName()).orElseThrow(), dto.sedeId());
        return equipoService.crear(dto);
    }

    @PutMapping("/{id}")
    public Equipo editar(@PathVariable Long id, @Valid @RequestBody EquipoCreateDTO dto) {
        return equipoService.actualizar(id, dto);
    }

    // Archivar (soft delete) — el historial se preserva
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void archivar(@PathVariable Long id) {
        equipoService.archivar(id);
    }

    // Eliminar definitivo — borra todo el historial
    @DeleteMapping("/{id}/definitivo")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void eliminarDefinitivo(@PathVariable Long id) {
        equipoService.eliminarDefinitivo(id);
    }

    // Restaurar equipo archivado
    @PatchMapping("/{id}/restaurar")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void restaurar(@PathVariable Long id) {
        equipoService.restaurar(id);
    }
}