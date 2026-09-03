package com.dispenserlatienda.service.usuario;

import com.dispenserlatienda.domain.usuario.RefreshToken;
import com.dispenserlatienda.domain.usuario.Usuario;
import com.dispenserlatienda.repository.usuario.RefreshTokenRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.Optional;

// Refresh token de sesión — la mitad "revocable" del login, separada del
// access token (JWT) que ya existía. Ver RefreshToken.java para el porqué.
//
// Simplificado a propósito respecto del patrón "de libro" (sin rotación por
// uso ni detección de robo): con 2-3 usuarios reales hoy, ese nivel de
// complejidad no se justifica. Lo que sí se mantiene: el token vive en la
// base y es lo único que hace falta borrar para cortar el acceso de verdad.
@Service
public class RefreshTokenService {

    private final RefreshTokenRepository repo;
    private final long expiracionMs;
    private final SecureRandom random = new SecureRandom();

    public RefreshTokenService(RefreshTokenRepository repo,
                                @Value("${refresh.token.expiration:2592000000}") long expiracionMs) {
        this.repo = repo;
        this.expiracionMs = expiracionMs;
    }

    @Transactional
    public String crear(Usuario usuario) {
        byte[] bytes = new byte[48];
        random.nextBytes(bytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        LocalDateTime ahora = LocalDateTime.now();
        RefreshToken rt = new RefreshToken(usuario, token, ahora, ahora.plusNanos(expiracionMs * 1_000_000L));
        repo.save(rt);
        return token;
    }

    // Valida el refresh token y, si está OK, extiende su vencimiento (ventana
    // deslizante) — mientras el usuario siga usando la app de vez en cuando,
    // el refresh token nunca llega a vencer solo.
    @Transactional
    public Optional<Usuario> validarYRenovar(String token) {
        return repo.findByToken(token)
                .filter(RefreshToken::esValido)
                .map(rt -> {
                    rt.setExpiraEn(LocalDateTime.now().plusNanos(expiracionMs * 1_000_000L));
                    return rt.getUsuario();
                });
    }

    @Transactional
    public void revocarTodosDeUsuario(Long usuarioId) {
        repo.revocarTodosDeUsuario(usuarioId);
    }
}
