package com.dispenserlatienda.controller.mapa;

import com.dispenserlatienda.domain.mapa.GeoUbicacion;
import com.dispenserlatienda.service.mapa.GeocodificadorService;
import com.dispenserlatienda.service.mapa.MapaService;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.Map;

// Mapa (7-oct-2026) — solo ADMIN (ver SecurityConfig)
@RestController
@RequestMapping("/api/mapa")
public class MapaController {

    private final MapaService service;
    private final GeocodificadorService geo;

    public MapaController(MapaService service, GeocodificadorService geo) {
        this.service = service;
        this.geo = geo;
    }

    @GetMapping
    public Map<String, Object> mapa(@RequestParam(required = false) String fecha) {
        return service.mapa(fecha != null && !fecha.isBlank() ? LocalDate.parse(fecha) : null);
    }

    // Corregir a mano dónde cae una dirección (tocando el mapa)
    @PutMapping("/ubicacion")
    public Map<String, Object> fijar(@RequestBody Map<String, Object> body) {
        String dir = (String) body.get("direccion");
        double lat = ((Number) body.get("lat")).doubleValue();
        double lng = ((Number) body.get("lng")).doubleValue();
        GeoUbicacion g = geo.fijarManual(dir, lat, lng);
        return Map.of("lat", g.getLat(), "lng", g.getLng(), "geo", g.getEstado());
    }
}
