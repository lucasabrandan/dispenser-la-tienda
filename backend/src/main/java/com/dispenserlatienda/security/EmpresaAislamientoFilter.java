package com.dispenserlatienda.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

// Portal Empresa (7-oct-2026): un usuario EMPRESA solo puede usar su portal,
// sus notificaciones y el push. Cualquier otra ruta de la API → 403, sin
// depender de que cada controller lo chequee (lista blanca, no negra).
// No es @Component a propósito: si no, Spring Boot lo registra además como filtro
// del servidor (antes de la seguridad) y OncePerRequestFilter ya no corre adentro.
public class EmpresaAislamientoFilter extends OncePerRequestFilter {

    private static final List<String> PERMITIDAS = List.of(
        "/api/empresa/", "/api/notificaciones", "/api/push/", "/api/auth/");

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
            throws ServletException, IOException {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        boolean esEmpresa = auth != null && auth.getAuthorities().stream().anyMatch(a -> "ROLE_EMPRESA".equals(a.getAuthority()));
        if (esEmpresa) {
            String path = req.getRequestURI();
            boolean ok = !path.startsWith("/api/")
                || (PERMITIDAS.stream().anyMatch(path::startsWith) && !path.startsWith("/api/notificaciones/por-trabajo"));
            if (!ok) {
                // Se escribe directo (no sendError): el despacho a /error terminaba en
                // 401 y el frontend lo toma como sesión vencida.
                res.setStatus(HttpServletResponse.SC_FORBIDDEN);
                res.setContentType("application/json;charset=UTF-8");
                res.getWriter().write("{\"status\":403,\"mensaje\":\"Sin acceso\"}");
                return;
            }
        }
        chain.doFilter(req, res);
    }
}
