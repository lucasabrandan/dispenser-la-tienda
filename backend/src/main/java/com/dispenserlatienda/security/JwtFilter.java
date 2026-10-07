package com.dispenserlatienda.security;

import jakarta.servlet.*;
import jakarta.servlet.http.*;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

@Component
public class JwtFilter extends OncePerRequestFilter {

    private final JwtUtil jwtUtil;
    private final com.dispenserlatienda.repository.usuario.UsuarioRepository usuarioRepo;

    // Testeo integral A9 (7-oct-2026): el rol salía del token (dura 24 h), así que
    // desactivar a alguien o cambiarle el rol no aplicaba hasta que venciera. Ahora el
    // rol y si está activo salen de la base, con una memoria corta de 30 s por usuario.
    private record Estado(String rol, boolean activo, long leido) {}
    private final java.util.Map<String, Estado> cache = new java.util.concurrent.ConcurrentHashMap<>();
    private static final long CACHE_MS = 30_000;

    public JwtFilter(JwtUtil jwtUtil, com.dispenserlatienda.repository.usuario.UsuarioRepository usuarioRepo) {
        this.jwtUtil = jwtUtil;
        this.usuarioRepo = usuarioRepo;
    }

    private Estado estadoDe(String username) {
        long ahora = System.currentTimeMillis();
        Estado e = cache.get(username);
        if (e != null && ahora - e.leido() < CACHE_MS) return e;
        e = usuarioRepo.findByUsername(username)
                .map(u -> new Estado(u.getRol().name(), u.isActivo(), ahora))
                .orElse(new Estado(null, false, ahora));
        cache.put(username, e);
        return e;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {

        String header = request.getHeader("Authorization");

        if (header != null && header.startsWith("Bearer ")) {
            String token = header.substring(7);
            if (jwtUtil.esValido(token)) {
                String username = jwtUtil.getUsername(token);
                Estado est = estadoDe(username);
                if (!est.activo() || est.rol() == null) { chain.doFilter(request, response); return; }
                String rol = est.rol();
                var auth = new UsernamePasswordAuthenticationToken(
                        username,
                        null,
                        List.of(new SimpleGrantedAuthority("ROLE_" + rol))
                );
                SecurityContextHolder.getContext().setAuthentication(auth);
            }
        }

        chain.doFilter(request, response);
    }
}
