package com.dispenserlatienda.controller.auth;

import com.dispenserlatienda.domain.usuario.Usuario;
import com.dispenserlatienda.dto.auth.LoginRequestDTO;
import com.dispenserlatienda.dto.auth.LoginResponseDTO;
import com.dispenserlatienda.repository.usuario.UsuarioRepository;
import com.dispenserlatienda.security.JwtUtil;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final JwtUtil jwtUtil;
    private final UsuarioRepository usuarioRepository;

    public AuthController(AuthenticationManager authenticationManager, JwtUtil jwtUtil,
                          UsuarioRepository usuarioRepository) {
        this.authenticationManager = authenticationManager;
        this.jwtUtil = jwtUtil;
        this.usuarioRepository = usuarioRepository;
    }

    @PostMapping("/login")
    public ResponseEntity<LoginResponseDTO> login(@Valid @RequestBody LoginRequestDTO request) {
        // El usuario reportó que un espacio de más (típico de autocompletar
        // del teclado del celu, o copiar/pegar) hacía fallar el login sin
        // ninguna pista de por qué — "admin " no es igual a "admin". Se
        // recorta el usuario (no la contraseña: ahí sí puede ser intencional,
        // no se toca).
        String username = request.username() == null ? null : request.username().trim();
        authenticationManager.authenticate(
            new UsernamePasswordAuthenticationToken(username, request.password())
        );

        Usuario usuario = usuarioRepository.findByUsername(username).orElseThrow();
        String token = jwtUtil.generarToken(usuario.getUsername(), usuario.getRol().name(), usuario.getNombre());

        return ResponseEntity.ok(new LoginResponseDTO(
            usuario.getId(),
            token,
            usuario.getUsername(),
            usuario.getNombre(),
            usuario.getRol().name(),
            usuario.getTelefono(),
            usuario.getWhatsapp(),
            usuario.getFirma(),
            usuario.getSueldoObjetivo()
        ));
    }

    // GET /api/auth/mi-firma — devuelve la firma guardada del usuario logueado
    @GetMapping("/mi-firma")
    public ResponseEntity<java.util.Map<String, String>> getMiFirma(
            @AuthenticationPrincipal String username) {
        return usuarioRepository.findByUsername(username)
            .map(u -> ResponseEntity.ok(java.util.Map.of("firma", u.getFirma() != null ? u.getFirma() : "")))
            .orElse(ResponseEntity.notFound().build());
    }

    // PATCH /api/auth/mi-firma — cualquier usuario autenticado puede guardar su propia firma
    @PatchMapping("/mi-firma")
    public ResponseEntity<Void> guardarMiFirma(
            @AuthenticationPrincipal String username,
            @RequestBody java.util.Map<String, String> payload) {
        usuarioRepository.findByUsername(username).ifPresent(u -> {
            u.setFirma(payload.get("firma"));
            usuarioRepository.save(u);
        });
        return ResponseEntity.noContent().build();
    }

    // PATCH /api/auth/mi-sueldo-objetivo — cualquier usuario puede cambiar su propio sueldo objetivo
    @PatchMapping("/mi-sueldo-objetivo")
    public ResponseEntity<Void> guardarMiSueldoObjetivo(
            @AuthenticationPrincipal String username,
            @RequestBody java.util.Map<String, Object> payload) {
        usuarioRepository.findByUsername(username).ifPresent(u -> {
            Object val = payload.get("sueldoObjetivo");
            u.setSueldoObjetivo(val != null ? new java.math.BigDecimal(val.toString()) : null);
            usuarioRepository.save(u);
        });
        return ResponseEntity.noContent().build();
    }
}
