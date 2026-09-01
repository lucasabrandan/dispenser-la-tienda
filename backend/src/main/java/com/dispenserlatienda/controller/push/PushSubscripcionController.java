package com.dispenserlatienda.controller.push;

import com.dispenserlatienda.domain.usuario.Usuario;
import com.dispenserlatienda.repository.usuario.UsuarioRepository;
import com.dispenserlatienda.service.push.PushSubscripcionService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/push")
public class PushSubscripcionController {

    @Value("${push.vapid.public-key:}")
    private String vapidPublicKey;

    private final PushSubscripcionService service;
    private final UsuarioRepository usuarioRepo;

    public PushSubscripcionController(PushSubscripcionService service, UsuarioRepository usuarioRepo) {
        this.service = service;
        this.usuarioRepo = usuarioRepo;
    }

    // El frontend necesita esto para PushManager.subscribe({applicationServerKey: ...})
    @GetMapping("/vapid-public-key")
    public ResponseEntity<Map<String, String>> obtenerVapidPublicKey() {
        return ResponseEntity.ok(Map.of("publicKey", vapidPublicKey == null ? "" : vapidPublicKey));
    }

    public record SuscripcionRequest(String endpoint, Keys keys) {
        public record Keys(String p256dh, String auth) {}
    }

    // Body = exactamente lo que devuelve PushSubscription.toJSON() en el navegador.
    @PostMapping("/suscribir")
    public ResponseEntity<Void> suscribir(@RequestBody SuscripcionRequest body, Authentication auth) {
        if (body.endpoint() == null || body.keys() == null
                || body.keys().p256dh() == null || body.keys().auth() == null) {
            return ResponseEntity.badRequest().build();
        }
        service.suscribir(resolverUsuario(auth), body.endpoint(), body.keys().p256dh(), body.keys().auth());
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/suscribir")
    public ResponseEntity<Void> desuscribir(@RequestBody Map<String, String> body) {
        String endpoint = body.get("endpoint");
        if (endpoint != null) service.desuscribir(endpoint);
        return ResponseEntity.noContent().build();
    }

    private Usuario resolverUsuario(Authentication auth) {
        String username = auth.getName();
        return usuarioRepo.findByUsername(username)
            .orElseThrow(() -> new IllegalStateException("Usuario no encontrado: " + username));
    }
}
