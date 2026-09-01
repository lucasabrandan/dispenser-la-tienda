package com.dispenserlatienda.controller.miespacio;

import com.dispenserlatienda.domain.usuario.Usuario;
import com.dispenserlatienda.repository.usuario.UsuarioRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

// Mi Espacio (Lucas, 31-ago, item 2): tableros kanban de notas personales del admin.
// Se guarda como un unico blob JSON por usuario (Usuario.espacioJson), sin modelado
// relacional - el frontend es dueno de la estructura interna (tableros/columnas/tarjetas).
@RestController
@RequestMapping("/api/mi-espacio")
public class MiEspacioController {

    private final UsuarioRepository usuarioRepo;

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

    private Usuario resolverUsuario(Authentication auth) {
        String username = auth.getName();
        return usuarioRepo.findByUsername(username)
            .orElseThrow(() -> new IllegalStateException("Usuario no encontrado: " + username));
    }
}
