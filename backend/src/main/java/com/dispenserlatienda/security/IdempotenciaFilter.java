package com.dispenserlatienda.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.util.ContentCachingResponseWrapper;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;

/**
 * Testeo integral A5 (7-oct-2026): con mala señal la app reintenta un pedido que quizás
 * ya llegó al servidor (o lo manda más tarde desde la cola "sin señal") y se duplicaban
 * trabajos. El frontend manda en cada POST/PUT/PATCH/DELETE una clave única
 * (X-Idem-Key) que se repite en los reintentos: si esa clave ya se procesó bien, se
 * devuelve la misma respuesta sin volver a ejecutar nada; si está en curso, se espera.
 * Solo se recuerdan las respuestas 2xx (un error se puede volver a intentar).
 * No es @Component: se registra solo dentro de la cadena de seguridad (SecurityConfig).
 */
public class IdempotenciaFilter extends OncePerRequestFilter {

    private static final long TTL_MS = TimeUnit.HOURS.toMillis(12);
    private static final int MAX = 20000;

    private record Respuesta(int status, String contentType, byte[] body) {}
    private record Entrada(CompletableFuture<Respuesta> futuro, long creado) {}

    private final Map<String, Entrada> claves = new ConcurrentHashMap<>();

    @Override
    protected boolean shouldNotFilter(HttpServletRequest req) {
        String m = req.getMethod();
        return req.getHeader("X-Idem-Key") == null
            || !("POST".equals(m) || "PUT".equals(m) || "PATCH".equals(m) || "DELETE".equals(m));
    }

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
            throws ServletException, IOException {
        String idem = req.getHeader("X-Idem-Key").trim();
        if (idem.isEmpty() || idem.length() > 100) { chain.doFilter(req, res); return; }
        Authentication a = SecurityContextHolder.getContext().getAuthentication();
        String clave = (a != null ? a.getName() : "-") + "|" + req.getMethod() + "|" + req.getRequestURI() + "|" + idem;
        limpiar();

        Entrada nueva = new Entrada(new CompletableFuture<>(), System.currentTimeMillis());
        Entrada previa = claves.putIfAbsent(clave, nueva);
        if (previa != null) {
            Respuesta r;
            try {
                r = previa.futuro().get(60, TimeUnit.SECONDS);
            } catch (Exception e) {
                res.setStatus(409);
                res.setContentType("application/json;charset=UTF-8");
                res.getWriter().write("{\"status\":409,\"mensaje\":\"Ese pedido ya se está procesando\",\"tipo\":\"DUPLICADO\"}");
                return;
            }
            res.setStatus(r.status());
            if (r.contentType() != null) res.setContentType(r.contentType());
            res.setHeader("X-Idem-Repetido", "1");
            res.getOutputStream().write(r.body());
            return;
        }

        ContentCachingResponseWrapper envoltura = new ContentCachingResponseWrapper(res);
        Respuesta r = null;
        try {
            chain.doFilter(req, envoltura);
            r = new Respuesta(envoltura.getStatus(), envoltura.getContentType(), envoltura.getContentAsByteArray());
        } finally {
            if (r != null && r.status() >= 200 && r.status() < 300) {
                nueva.futuro().complete(r);
            } else {
                claves.remove(clave, nueva);
                if (r != null) nueva.futuro().complete(r); else nueva.futuro().cancel(false);
            }
            envoltura.copyBodyToResponse();
        }
    }

    private void limpiar() {
        long ahora = System.currentTimeMillis();
        if (claves.size() < 200 && Math.random() > 0.05) return;
        claves.entrySet().removeIf(e -> ahora - e.getValue().creado() > TTL_MS && e.getValue().futuro().isDone());
        if (claves.size() > MAX) claves.entrySet().removeIf(e -> e.getValue().futuro().isDone());
    }
}
