package com.dispenserlatienda.controller.miespacio;

import com.dispenserlatienda.domain.usuario.RolUsuario;
import com.dispenserlatienda.domain.usuario.Usuario;
import com.dispenserlatienda.repository.usuario.UsuarioRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

// Mi Espacio (Lucas, 31-ago, item 2): tableros kanban + checklist de notas
// personales, por usuario (admin y tecnicos, cada uno el suyo, ver
// SecurityConfig). Se guarda como un unico blob JSON por usuario
// (Usuario.espacioJson), sin modelado relacional - el frontend es dueno de la
// estructura interna ({ boards: [...], checklist: [...] }).
@RestController
@RequestMapping("/api/mi-espacio")
public class MiEspacioController {

    private final UsuarioRepository usuarioRepo;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public MiEspacioController(UsuarioRepository usuarioRepo) {
        this.usuarioRepo = usuarioRepo;
    }

    @GetMapping
    public ResponseEntity<Map<String, String>> obtener(Authentication auth) {
        Usuario u = resolverUsuario(auth);
        return ResponseEntity.ok(Map.of("espacioJson", u.getEspacioJson() != null ? u.getEspacioJson() : ""));
    }

    @PutMapping
    public ResponseEntity<Void> guardar(Authentication auth, @RequestBody Map<String, String> body) {
        Usuario u = resolverUsuario(auth);
        u.setEspacioJson(body.get("espacioJson"));
        usuarioRepo.save(u);
        return ResponseEntity.noContent().build();
    }

    // Solo ADMIN (ver SecurityConfig -- /api/mi-espacio/admin/** es hasRole("ADMIN"),
    // regla mas especifica que /api/mi-espacio/** de arriba). Lucas, 8-sep-2026:
    // "que el admin vea todos" los checklists de los tecnicos, sin poder editarlos
    // desde aca (cada uno maneja el suyo). Devuelve solo el campo "checklist" de cada
    // uno -- el tablero (boards) es privado, no hace falta exponerlo aca.
    @GetMapping("/admin/tecnicos")
    public ResponseEntity<List<Map<String, Object>>> obtenerChecklistsTecnicos() {
        List<Usuario> tecnicos = usuarioRepo.findByRolAndActivoTrue(RolUsuario.TECNICO);
        List<Map<String, Object>> resultado = tecnicos.stream()
            .map(t -> Map.<String, Object>of(
                "usuarioId", t.getId(),
                "nombre", t.getNombre(),
                "checklist", extraerChecklist(t.getEspacioJson())
            ))
            .toList();
        return ResponseEntity.ok(resultado);
    }

    private List<Object> extraerChecklist(String espacioJson) {
        if (espacioJson == null || espacioJson.isBlank()) return List.of();
        try {
            JsonNode raiz = objectMapper.readTree(espacioJson);
            JsonNode checklist = raiz.get("checklist");
            if (checklist == null || !checklist.isArray()) return List.of();
            return objectMapper.convertValue(checklist, new TypeReference<List<Object>>() {});
        } catch (Exception e) {
            return List.of();
        }
    }

    private Usuario resolverUsuario(Authentication auth) {
        String username = auth.getName();
        return usuarioRepo.findByUsername(username)
            .orElseThrow(() -> new IllegalStateException("Usuario no encontrado: " + username));
    }
}
