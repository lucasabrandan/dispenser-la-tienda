package com.dispenserlatienda.controller.rendicion;

import com.dispenserlatienda.domain.rendicion.Rendicion;
import com.dispenserlatienda.domain.usuario.RolUsuario;
import com.dispenserlatienda.domain.usuario.Usuario;
import com.dispenserlatienda.exception.ResourceNotFoundException;
import com.dispenserlatienda.repository.rendicion.RendicionRepository;
import com.dispenserlatienda.repository.usuario.UsuarioRepository;
import com.dispenserlatienda.service.orden.OrdenVisitaService;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

/**
 * Rendiciones diarias de efectivo (2-oct-2026).
 *  POST /api/rendiciones           — el técnico envía su "Cerrar mi día" (avisa al admin)
 *  GET  /api/rendiciones/pendientes — admin: las que todavía no recibió
 *  PATCH /api/rendiciones/{id}/recibido — admin: "Recibido"
 */
@RestController
@RequestMapping("/api/rendiciones")
public class RendicionController {

    private final RendicionRepository repo;
    private final UsuarioRepository usuarioRepository;
    private final OrdenVisitaService ordenVisitaService;

    public RendicionController(RendicionRepository repo, UsuarioRepository usuarioRepository,
                               OrdenVisitaService ordenVisitaService) {
        this.repo = repo;
        this.usuarioRepository = usuarioRepository;
        this.ordenVisitaService = ordenVisitaService;
    }

    private Usuario usuario(Authentication auth) {
        return usuarioRepository.findByUsername(auth.getName())
            .orElseThrow(() -> new IllegalStateException("Usuario no encontrado"));
    }

    private Map<String, Object> dto(Rendicion r) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", r.getId());
        m.put("tecnicoId", r.getTecnico().getId());
        m.put("tecnicoNombre", r.getTecnico().getNombre());
        m.put("fecha", r.getFecha());
        m.put("monto", r.getMonto());
        m.put("detalle", r.getDetalle());
        m.put("nota", r.getNota());
        m.put("creadoEn", r.getCreadoEn());
        m.put("recibido", r.isRecibido());
        return m;
    }

    @PostMapping
    // Sin @Transactional a propósito: la rendición se guarda primero (save tiene su
    // propia transacción) y si después falla el aviso al admin, no se pierde.
    public Map<String, Object> enviar(@RequestBody Map<String, Object> body, Authentication auth) {
        Usuario u = usuario(auth);
        LocalDate fecha = body.get("fecha") != null ? LocalDate.parse(body.get("fecha").toString()) : LocalDate.now();
        BigDecimal monto;
        try { monto = new BigDecimal(String.valueOf(body.getOrDefault("monto", "0"))); }
        catch (Exception e) { throw new IllegalArgumentException("Monto inválido"); }
        if (monto.signum() < 0) throw new IllegalArgumentException("Monto inválido");

        Rendicion r = repo.findByTecnicoIdAndFecha(u.getId(), fecha).orElse(null);
        if (r != null && r.isRecibido())
            throw new IllegalArgumentException("La rendición de ese día ya fue recibida por el admin");
        if (r == null) r = new Rendicion(u, fecha);
        String detalle = Objects.toString(body.get("detalle"), "");
        r.setMonto(monto);
        r.setDetalle(detalle);
        r.setNota(Objects.toString(body.get("nota"), null));
        r.setCreadoEn(LocalDateTime.now());
        repo.save(r);

        // Aviso al admin (app + push + WhatsApp) por el mismo canal que "Avisar al admin"
        try {
            ordenVisitaService.mensajeAlAdmin(u, detalle.isBlank() ? "Cierre del día enviado" : detalle.substring(0, Math.min(detalle.length(), 1000)));
        } catch (Exception ignored) { /* el aviso no debe frenar la rendición */ }
        return dto(r);
    }

    @GetMapping("/pendientes")
    @Transactional(readOnly = true)
    public List<Map<String, Object>> pendientes(Authentication auth) {
        if (usuario(auth).getRol() != RolUsuario.ADMIN) throw new AccessDeniedException("Solo admin");
        return repo.findByRecibidoFalseOrderByFechaAsc().stream().map(this::dto).toList();
    }

    @PatchMapping("/{id}/recibido")
    @Transactional
    public Map<String, Object> recibido(@PathVariable Long id, Authentication auth) {
        if (usuario(auth).getRol() != RolUsuario.ADMIN) throw new AccessDeniedException("Solo admin");
        Rendicion r = repo.findById(id).orElseThrow(() -> new ResourceNotFoundException("Rendición no encontrada"));
        r.setRecibido(true);
        r.setRecibidoEn(LocalDateTime.now());
        return dto(r);
    }
}
