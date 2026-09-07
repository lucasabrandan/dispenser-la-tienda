package com.dispenserlatienda.controller.orden;

import com.dispenserlatienda.domain.orden.NotaAgenda;
import com.dispenserlatienda.domain.usuario.RolUsuario;
import com.dispenserlatienda.domain.usuario.Usuario;
import com.dispenserlatienda.dto.orden.NotaAgendaDTO;
import com.dispenserlatienda.exception.ResourceNotFoundException;
import com.dispenserlatienda.repository.orden.NotaAgendaRepository;
import com.dispenserlatienda.repository.usuario.UsuarioRepository;
import com.dispenserlatienda.service.orden.NotaAgendaService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/notas-agenda")
public class NotaAgendaController {

    private final NotaAgendaService service;
    private final NotaAgendaRepository repo;
    private final UsuarioRepository usuarioRepository;

    public NotaAgendaController(NotaAgendaService service, NotaAgendaRepository repo, UsuarioRepository usuarioRepository) {
        this.service = service;
        this.repo = repo;
        this.usuarioRepository = usuarioRepository;
    }

    @GetMapping("/all")
    public ResponseEntity<List<NotaAgendaDTO>> listarTodas(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta) {
        return ResponseEntity.ok(service.listarTodas(desde, hasta));
    }

    @GetMapping("/{tecnicoId}")
    public ResponseEntity<List<NotaAgendaDTO>> listar(
            @PathVariable Long tecnicoId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta,
            Authentication auth) {
        verificarAccesoTecnico(tecnicoId, auth);
        return ResponseEntity.ok(service.listarPorTecnico(tecnicoId, desde, hasta));
    }

    @PostMapping
    public ResponseEntity<NotaAgendaDTO> crear(@RequestBody NotaAgendaDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.crear(dto));
    }

    @PatchMapping("/{id}/toggle")
    public ResponseEntity<NotaAgendaDTO> toggle(@PathVariable Long id, Authentication auth) {
        verificarAccesoNota(id, auth);
        return ResponseEntity.ok(service.toggleCompletada(id));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable Long id, Authentication auth) {
        verificarAccesoNota(id, auth);
        service.eliminar(id);
        return ResponseEntity.noContent().build();
    }

    private Usuario resolverUsuario(Authentication auth) {
        String username = auth.getName();
        return usuarioRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalStateException("Usuario no encontrado: " + username));
    }

    // Antes cualquier tecnico autenticado podia ver o completar la agenda de
    // otro con solo cambiar el tecnicoId en la URL (no habia ningun chequeo
    // de dueño). Mismo patron ya usado en ServicioController: admin sin
    // restriccion, tecnico solo lo suyo. Hallazgo Alto #11, auditoria 1-sep.
    private void verificarAccesoTecnico(Long tecnicoId, Authentication auth) {
        Usuario solicitante = resolverUsuario(auth);
        if (solicitante.getRol() == RolUsuario.ADMIN) return;
        if (!solicitante.getId().equals(tecnicoId)) {
            throw new AccessDeniedException("No podés ver la agenda de otro técnico");
        }
    }

    private void verificarAccesoNota(Long notaId, Authentication auth) {
        Usuario solicitante = resolverUsuario(auth);
        if (solicitante.getRol() == RolUsuario.ADMIN) return;
        NotaAgenda nota = repo.findById(notaId)
                .orElseThrow(() -> new ResourceNotFoundException("Nota no encontrada con ID: " + notaId));
        if (nota.getTecnico() == null || !nota.getTecnico().getId().equals(solicitante.getId())) {
            throw new AccessDeniedException("No podés modificar la nota de otro técnico");
        }
    }
}
