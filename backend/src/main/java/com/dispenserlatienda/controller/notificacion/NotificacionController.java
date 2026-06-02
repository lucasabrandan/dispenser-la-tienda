package com.dispenserlatienda.controller.notificacion;

import com.dispenserlatienda.domain.usuario.Usuario;
import com.dispenserlatienda.dto.notificacion.NotificacionDTO;
import com.dispenserlatienda.repository.usuario.UsuarioRepository;
import com.dispenserlatienda.service.notificacion.NotificacionService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notificaciones")
public class NotificacionController {

    private final NotificacionService service;
    private final UsuarioRepository usuarioRepo;

    public NotificacionController(NotificacionService service, UsuarioRepository usuarioRepo) {
        this.service = service;
        this.usuarioRepo = usuarioRepo;
    }

    @GetMapping
    public ResponseEntity<List<NotificacionDTO>> listar(Authentication auth) {
        Long userId = resolverUserId(auth);
        return ResponseEntity.ok(service.listar(userId));
    }

    @GetMapping("/count")
    public ResponseEntity<Map<String, Long>> contarNoLeidas(Authentication auth) {
        Long userId = resolverUserId(auth);
        return ResponseEntity.ok(Map.of("count", service.contarNoLeidas(userId)));
    }

    @PatchMapping("/{id}/leer")
    public ResponseEntity<Void> marcarLeida(@PathVariable Long id) {
        service.marcarLeida(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/leer-todas")
    public ResponseEntity<Void> marcarTodasLeidas(Authentication auth) {
        Long userId = resolverUserId(auth);
        service.marcarTodasLeidas(userId);
        return ResponseEntity.noContent().build();
    }

    private Long resolverUserId(Authentication auth) {
        String username = auth.getName();
        Usuario u = usuarioRepo.findByUsername(username)
            .orElseThrow(() -> new IllegalStateException("Usuario no encontrado: " + username));
        return u.getId();
    }
}
