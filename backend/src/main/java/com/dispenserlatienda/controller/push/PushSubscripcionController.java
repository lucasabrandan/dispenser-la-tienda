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
        // Testeo integral A12: solo direcciones de los servicios de push reales de los
        // navegadores (antes se podía registrar cualquier URL y el servidor le escribía).
        if (!endpointValido(body.endpoint())) return ResponseEntity.badRequest().build();
        service.suscribir(resolverUsuario(auth), body.endpoint(), body.keys().p256dh(), body.keys().auth());
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/suscribir")
    public ResponseEntity<Void> desuscribir(@RequestBody Map<String, String> body, Authentication auth) {
        String endpoint = body.get("endpoint");
        // Solo la propia (antes cualquiera podía borrar la suscripción de otro)
        if (endpoint != null) service.desuscribir(endpoint, resolverUsuario(auth));
        return ResponseEntity.noContent().build();
    }

    private static final java.util.List<String> HOSTS_PUSH = java.util.List.of(
        "fcm.googleapis.com", "android.googleapis.com", "updates.push.services.mozilla.com",
        "web.push.apple.com", "notify.windows.com", "push.services.mozilla.com");

    static boolean endpointValido(String endpoint) {
        try {
            java.net.URI u = java.net.URI.create(endpoint);
            if (!"https".equalsIgnoreCase(u.getScheme()) || u.getHost() == null || endpoint.length() > 1000) return false;
            String h = u.getHost().toLowerCase();
            return HOSTS_PUSH.stream().anyMatch(x -> h.equals(x) || h.endsWith("." + x));
        } catch (Exception e) {
            return false;
        }
    }

    private Usuario resolverUsuario(Authentication auth) {
        String username = auth.getName();
        return usuarioRepo.findByUsername(username)
            .orElseThrow(() -> new IllegalStateException("Usuario no encontrado: " + username));
    }
}
