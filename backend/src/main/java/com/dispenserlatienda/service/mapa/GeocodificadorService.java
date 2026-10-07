package com.dispenserlatienda.service.mapa;

import com.dispenserlatienda.domain.mapa.GeoUbicacion;
import com.dispenserlatienda.repository.mapa.GeoUbicacionRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.text.Normalizer;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.*;

// Mapa (7-oct-2026): pasa direcciones de texto a coordenadas con el buscador libre
// de OpenStreetMap (Nominatim). Su regla de uso: como máximo 1 pedido por segundo
// y guardar los resultados — por eso cada dirección se busca UNA vez, en segundo
// plano, de a una, y queda guardada en geo_ubicacion.
@Service
public class GeocodificadorService {

    private static final Logger log = LoggerFactory.getLogger(GeocodificadorService.class);
    private static final String URL = "https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=ar&q=";

    private final GeoUbicacionRepository repo;
    private final ObjectMapper json;
    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(8)).build();

    @Value("${mapa.geocodificar:true}")
    private boolean habilitado;

    public GeocodificadorService(GeoUbicacionRepository repo, ObjectMapper json) {
        this.repo = repo;
        this.json = json;
    }

    public static String clave(String direccion) {
        if (direccion == null) return null;
        String s = Normalizer.normalize(direccion, Normalizer.Form.NFD).replaceAll("\\p{M}", "")
            .toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9 ]", " ").replaceAll("\\s+", " ").trim();
        return s.isEmpty() ? null : (s.length() > 480 ? s.substring(0, 480) : s);
    }

    // Devuelve lo que se sabe de cada dirección y deja en cola las que nunca se buscaron
    @Transactional
    public Map<String, GeoUbicacion> ubicar(Collection<String> direcciones) {
        Map<String, String> porClave = new LinkedHashMap<>();
        for (String d : direcciones) {
            String k = clave(d);
            if (k != null) porClave.putIfAbsent(k, d.trim());
        }
        Map<String, GeoUbicacion> out = new HashMap<>();
        if (porClave.isEmpty()) return out;
        for (GeoUbicacion g : repo.findByClaveIn(porClave.keySet())) out.put(g.getClave(), g);
        for (var e : porClave.entrySet()) {
            if (out.containsKey(e.getKey())) continue;
            GeoUbicacion g = new GeoUbicacion();
            g.setClave(e.getKey());
            g.setDireccion(e.getValue().length() > 500 ? e.getValue().substring(0, 500) : e.getValue());
            try { out.put(e.getKey(), repo.save(g)); } catch (Exception ex) { /* otra pestaña la creó recién */ }
        }
        return out;
    }

    public GeoUbicacion de(Map<String, GeoUbicacion> mapa, String direccion) {
        String k = clave(direccion);
        return k == null ? null : mapa.get(k);
    }

    public long pendientes() { return repo.countByEstado("PENDIENTE"); }

    @Transactional
    public GeoUbicacion fijarManual(String direccion, double lat, double lng) {
        String k = clave(direccion);
        if (k == null) throw new IllegalArgumentException("Falta la dirección");
        GeoUbicacion g = repo.findByClave(k).orElseGet(() -> { GeoUbicacion n = new GeoUbicacion(); n.setClave(k); n.setDireccion(direccion.trim()); return n; });
        g.setLat(lat); g.setLng(lng); g.setEstado("OK"); g.setManual(true); g.setActualizadoEn(LocalDateTime.now());
        return repo.save(g);
    }

    // De a una dirección por vez, con pausa: respeta el límite de 1 pedido por segundo
    @Scheduled(fixedDelay = 1500, initialDelay = 20000)
    public void procesarPendiente() {
        if (!habilitado) return;
        GeoUbicacion g = repo.findFirstByEstadoOrderByIdAsc("PENDIENTE").orElse(null);
        if (g == null) return;
        double[] punto = null;
        boolean sinRed = false;
        for (String q : variantes(g.getDireccion())) {
            try {
                punto = buscar(q);
                if (punto != null) break;
            } catch (Exception e) {
                sinRed = true;
                log.warn("Mapa: no se pudo buscar '{}': {}", g.getDireccion(), e.getMessage());
                break;
            } finally {
                try { Thread.sleep(1100); } catch (InterruptedException ie) { Thread.currentThread().interrupt(); }
            }
        }
        if (sinRed) return; // se reintenta en la próxima vuelta
        if (punto != null) { g.setLat(punto[0]); g.setLng(punto[1]); g.setEstado("OK"); }
        else g.setEstado("NO_ENCONTRADA");
        g.setActualizadoEn(LocalDateTime.now());
        repo.save(g);
    }

    private double[] buscar(String q) throws Exception {
        HttpRequest req = HttpRequest.newBuilder(URI.create(URL + URLEncoder.encode(q, StandardCharsets.UTF_8)))
            .header("User-Agent", "gestiondlt/1.0 (info@dispenserlatienda.com.ar)")
            .header("Accept-Language", "es")
            .timeout(Duration.ofSeconds(12)).GET().build();
        HttpResponse<String> res = http.send(req, HttpResponse.BodyHandlers.ofString());
        if (res.statusCode() == 429 || res.statusCode() >= 500) throw new IllegalStateException("HTTP " + res.statusCode());
        if (res.statusCode() != 200) return null;
        JsonNode arr = json.readTree(res.body());
        if (!arr.isArray() || arr.isEmpty()) return null;
        return new double[]{ arr.get(0).path("lat").asDouble(), arr.get(0).path("lon").asDouble() };
    }

    // Variantes de búsqueda, de la más completa a la más simple
    static List<String> variantes(String dir) {
        String d = dir == null ? "" : dir.trim();
        d = d.replaceAll("(?i)\\b(c\\.?a\\.?b\\.?a\\.?|capital federal|cap\\.? fed\\.?)\\b", "Ciudad Autónoma de Buenos Aires");
        String sinPiso = d.replaceAll("(?i)\\b(piso|p\\.|dto\\.?|depto\\.?|departamento|of\\.?|oficina|local|lote|torre|uf)\\s*[\\w°º-]+", "")
            .replaceAll("\\d+\\s*[°º]\\s*\\w?", "").replaceAll("\\s*,\\s*,", ",").replaceAll("\\s+", " ").replaceAll("\\s+,", ",").trim();
        LinkedHashSet<String> v = new LinkedHashSet<>();
        v.add(sinPiso + ", Argentina");
        if (!sinPiso.toLowerCase().contains("buenos aires")) v.add(sinPiso + ", Buenos Aires, Argentina");
        // Sin el último tramo (a veces el barrio confunde)
        int coma = sinPiso.indexOf(',');
        if (coma > 0) v.add(sinPiso.substring(0, coma) + ", Buenos Aires, Argentina");
        return new ArrayList<>(v).subList(0, Math.min(3, v.size()));
    }
}
