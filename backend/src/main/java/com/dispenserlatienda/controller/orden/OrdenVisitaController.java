package com.dispenserlatienda.controller.orden;

import com.dispenserlatienda.domain.orden.OrdenVisita;
import com.dispenserlatienda.domain.usuario.RolUsuario;
import com.dispenserlatienda.domain.usuario.Usuario;
import com.dispenserlatienda.dto.orden.OrdenAvanceDTO;
import com.dispenserlatienda.dto.orden.OrdenVisitaCreateDTO;
import com.dispenserlatienda.dto.orden.OrdenVisitaDTO;
import com.dispenserlatienda.exception.ResourceNotFoundException;
import com.dispenserlatienda.repository.orden.OrdenVisitaRepository;
import com.dispenserlatienda.repository.usuario.UsuarioRepository;
import com.dispenserlatienda.service.orden.OrdenVisitaService;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/ordenes")
public class OrdenVisitaController {

    private final OrdenVisitaService service;
    private final OrdenVisitaRepository repo;
    private final UsuarioRepository usuarioRepository;

    public OrdenVisitaController(OrdenVisitaService service, OrdenVisitaRepository repo, UsuarioRepository usuarioRepository) {
        this.service = service;
        this.repo = repo;
        this.usuarioRepository = usuarioRepository;
    }

    // Admin: listar todas con rango opcional
    @GetMapping
    public ResponseEntity<List<OrdenVisitaDTO>> listar(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta) {
        return ResponseEntity.ok(service.listarTodas(desde, hasta));
    }

    // Técnico: mis órdenes activas
    @GetMapping("/mias/{tecnicoId}")
    public ResponseEntity<List<OrdenVisitaDTO>> mias(@PathVariable Long tecnicoId, Authentication auth) {
        verificarAccesoTecnico(tecnicoId, auth);
        return ResponseEntity.ok(service.listarPorTecnico(tecnicoId));
    }

    // Técnico: historial completo
    @GetMapping("/historial/{tecnicoId}")
    public ResponseEntity<List<OrdenVisitaDTO>> historial(@PathVariable Long tecnicoId, Authentication auth) {
        verificarAccesoTecnico(tecnicoId, auth);
        return ResponseEntity.ok(service.listarHistorialTecnico(tecnicoId));
    }

    // Admin: crear
    @PostMapping
    public ResponseEntity<OrdenVisitaDTO> crear(@Valid @RequestBody OrdenVisitaCreateDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.crear(dto));
    }

    // Admin: editar
    @PutMapping("/{id}")
    public ResponseEntity<OrdenVisitaDTO> actualizar(@PathVariable Long id,
                                                      @Valid @RequestBody OrdenVisitaCreateDTO dto) {
        return ResponseEntity.ok(service.actualizar(id, dto));
    }

    // Admin: eliminar
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable Long id) {
        service.eliminar(id);
        return ResponseEntity.noContent().build();
    }

    // Técnico/Admin: avanzar estado
    @PatchMapping("/{id}/estado")
    public ResponseEntity<OrdenVisitaDTO> avanzar(@PathVariable Long id,
                                                   @RequestBody OrdenAvanceDTO dto,
                                                   Authentication auth) {
        verificarAccesoOrden(id, auth);
        return ResponseEntity.ok(service.avanzarEstado(id, dto));
    }

    // Badge: count activas totales (admin) o por técnico
    @GetMapping("/count-activas")
    public ResponseEntity<Map<String, Long>> countActivas(
            @RequestParam(required = false) Long tecnicoId) {
        long count = tecnicoId != null
            ? service.countActivasTecnico(tecnicoId)
            : service.countActivas();
        return ResponseEntity.ok(Map.of("count", count));
    }

    // Lista de técnicos disponibles para el form de creación
    @GetMapping("/tecnicos")
    public ResponseEntity<List<Map<String, Object>>> tecnicos() {
        List<Map<String, Object>> result = service.listarTecnicos().stream()
            .map(u -> Map.<String, Object>of("id", u.getId(), "nombre", u.getNombre()))
            .toList();
        return ResponseEntity.ok(result);
    }

    private Usuario resolverUsuario(Authentication auth) {
        String username = auth.getName();
        return usuarioRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalStateException("Usuario no encontrado: " + username));
    }

    // Antes cualquier tecnico autenticado podia ver o avanzar el estado de la
    // orden de otro con solo cambiar el tecnicoId/id en la URL (no habia
    // ningun chequeo de dueño). Mismo patron ya usado en ServicioController:
    // admin sin restriccion, tecnico solo lo suyo. Hallazgo Alto #11, auditoria 1-sep.
    private void verificarAccesoTecnico(Long tecnicoId, Authentication auth) {
        Usuario solicitante = resolverUsuario(auth);
        if (solicitante.getRol() == RolUsuario.ADMIN) return;
        if (!solicitante.getId().equals(tecnicoId)) {
            throw new AccessDeniedException("No podés ver las órdenes de otro técnico");
        }
    }

    private void verificarAccesoOrden(Long ordenId, Authentication auth) {
        Usuario solicitante = resolverUsuario(auth);
        if (solicitante.getRol() == RolUsuario.ADMIN) return;
        OrdenVisita orden = repo.findById(ordenId)
                .orElseThrow(() -> new ResourceNotFoundException("Orden no encontrada con ID: " + ordenId));
        if (orden.getTecnico() == null || !orden.getTecnico().getId().equals(solicitante.getId())) {
            throw new AccessDeniedException("No podés modificar la orden de otro técnico");
        }
    }
}
