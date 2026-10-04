package com.dispenserlatienda.controller.propio;

import com.dispenserlatienda.domain.propio.BloqueoTecnico;
import com.dispenserlatienda.domain.usuario.RolUsuario;
import com.dispenserlatienda.domain.usuario.Usuario;
import com.dispenserlatienda.exception.ResourceNotFoundException;
import com.dispenserlatienda.repository.propio.BloqueoTecnicoRepository;
import com.dispenserlatienda.repository.usuario.UsuarioRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.*;

// Días ocupados del técnico/socio (5-oct-2026). Él los carga en "Lo mío";
// el admin los ve en la agenda como "ocupado" (sin la nota) al asignar visitas.
@RestController
@RequestMapping("/api/bloqueos")
public class BloqueoTecnicoController {
    private static final Set<String> FRANJAS = Set.of("MANANA", "TARDE", "DIA");
    private final BloqueoTecnicoRepository repo;
    private final UsuarioRepository usuarioRepository;

    public BloqueoTecnicoController(BloqueoTecnicoRepository repo, UsuarioRepository usuarioRepository) {
        this.repo = repo;
        this.usuarioRepository = usuarioRepository;
    }

    // Los míos, completos (con nota)
    @GetMapping("/mios")
    @Transactional(readOnly = true)
    public List<Map<String, Object>> mios(Authentication auth) {
        return repo.findByTecnicoIdOrderByDiaSemanaAscFechaAsc(yo(auth).getId()).stream()
                .filter(b -> b.getFecha() == null || !b.getFecha().isBefore(LocalDate.now()))
                .map(b -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("id", b.getId());
                    m.put("fecha", b.getFecha());
                    m.put("diaSemana", b.getDiaSemana());
                    m.put("franja", b.getFranja());
                    m.put("nota", b.getNota());
                    return m;
                }).toList();
    }

    @PostMapping
    @Transactional
    public ResponseEntity<Map<String, Object>> crear(@RequestBody Map<String, Object> body, Authentication auth) {
        String franja = String.valueOf(body.getOrDefault("franja", "DIA"));
        if (!FRANJAS.contains(franja)) throw new IllegalArgumentException("Franja inválida");
        BloqueoTecnico b = new BloqueoTecnico();
        b.setTecnico(yo(auth));
        b.setFranja(franja);
        Object fecha = body.get("fecha"), dia = body.get("diaSemana");
        if (fecha != null && !String.valueOf(fecha).isBlank()) {
            b.setFecha(LocalDate.parse(String.valueOf(fecha)));
        } else if (dia != null) {
            int d = Integer.parseInt(String.valueOf(dia));
            if (d < 1 || d > 7) throw new IllegalArgumentException("Día inválido");
            b.setDiaSemana(d);
        } else {
            throw new IllegalArgumentException("Elegí un día");
        }
        Object nota = body.get("nota");
        if (nota != null && !String.valueOf(nota).isBlank()) {
            String n = String.valueOf(nota).trim();
            b.setNota(n.length() > 200 ? n.substring(0, 200) : n);
        }
        repo.save(b);
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("id", b.getId()));
    }

    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<Void> borrar(@PathVariable Long id, Authentication auth) {
        BloqueoTecnico b = repo.findByIdAndTecnicoId(id, yo(auth).getId())
                .orElseThrow(() -> new ResourceNotFoundException("No encontrado"));
        repo.delete(b);
        return ResponseEntity.noContent().build();
    }

    // Ocupaciones día por día en un rango (sin nota). Admin: de todos; técnico: las suyas.
    @GetMapping("/agenda")
    @Transactional(readOnly = true)
    public List<Map<String, Object>> agenda(@RequestParam String desde, @RequestParam String hasta, Authentication auth) {
        LocalDate d = LocalDate.parse(desde), h = LocalDate.parse(hasta);
        if (h.isBefore(d) || d.plusDays(62).isBefore(h)) throw new IllegalArgumentException("Rango inválido");
        Usuario yo = yo(auth);
        List<BloqueoTecnico> todos = yo.getRol() == RolUsuario.ADMIN
                ? repo.findAll() : repo.findByTecnicoIdOrderByDiaSemanaAscFechaAsc(yo.getId());
        List<Map<String, Object>> out = new ArrayList<>();
        for (LocalDate f = d; !f.isAfter(h); f = f.plusDays(1)) {
            for (BloqueoTecnico b : todos) {
                boolean aplica = (b.getFecha() != null && b.getFecha().equals(f))
                        || (b.getDiaSemana() != null && b.getDiaSemana() == f.getDayOfWeek().getValue());
                if (!aplica || b.getTecnico() == null || !b.getTecnico().isActivo()) continue;
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("tecnicoId", b.getTecnico().getId());
                m.put("tecnicoNombre", b.getTecnico().getNombre());
                m.put("fecha", f.toString());
                m.put("franja", b.getFranja());
                out.add(m);
            }
        }
        return out;
    }

    private Usuario yo(Authentication auth) {
        return usuarioRepository.findByUsername(auth.getName())
                .orElseThrow(() -> new IllegalStateException("Usuario no encontrado"));
    }
}
