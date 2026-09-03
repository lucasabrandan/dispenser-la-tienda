package com.dispenserlatienda.controller.auth;

import com.dispenserlatienda.domain.usuario.Usuario;
import com.dispenserlatienda.dto.auth.LoginRequestDTO;
import com.dispenserlatienda.dto.auth.LoginResponseDTO;
import com.dispenserlatienda.dto.auth.RefreshRequestDTO;
import com.dispenserlatienda.repository.usuario.UsuarioRepository;
import com.dispenserlatienda.security.JwtUtil;
import com.dispenserlatienda.service.usuario.RefreshTokenService;
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
    private final RefreshTokenService refreshTokenService;

    public AuthController(AuthenticationManager authenticationManager, JwtUtil jwtUtil,
                          UsuarioRepository usuarioRepository, RefreshTokenService refreshTokenService) {
        this.authenticationManager = authenticationManager;
        this.jwtUtil = jwtUtil;
        this.usuarioRepository = usuarioRepository;
        this.refreshTokenService = refreshTokenService;
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
        String refreshToken = refreshTokenService.crear(usuario);

        return ResponseEntity.ok(new LoginResponseDTO(
            usuario.getId(),
            token,
            refreshToken,
            usuario.getUsername(),
            usuario.getNombre(),
            usuario.getRol().name(),
            usuario.getTelefono(),
            usuario.getWhatsapp(),
            usuario.getFirma(),
            usuario.getSueldoObjetivo()
        ));
    }

    // POST /api/auth/refresh — canjea un refresh token (guardado en base, ver
    // RefreshTokenService) por un access token nuevo, sin pedir usuario/clave
    // de nuevo. Lo llama el interceptor de axios cuando el access token
    // vence, y además el frontend lo llama de forma proactiva de tanto en
    // tanto mientras la app está abierta — eso es lo que evita que el token
    // cacheado para las notificaciones push (ver pushTokenCache.js) quede
    // vencido si el usuario no abre la app en más de 24hs.
    @PostMapping("/refresh")
    public ResponseEntity<java.util.Map<String, String>> refresh(@Valid @RequestBody RefreshRequestDTO request) {
        return refreshTokenService.validarYRenovar(request.refreshToken())
            .map(usuario -> {
                String nuevoAccessToken = jwtUtil.generarToken(usuario.getUsername(), usuario.getRol().name(), usuario.getNombre());
                return ResponseEntity.ok(java.util.Map.of("accessToken", nuevoAccessToken));
            })
            .orElseGet(() -> ResponseEntity.status(org.springframework.http.HttpStatus.UNAUTHORIZED).build());
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
