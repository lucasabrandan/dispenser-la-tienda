package com.dispenserlatienda.controller;

import com.dispenserlatienda.domain.Equipo;
import com.dispenserlatienda.domain.servicio.ServicioItem;
import com.dispenserlatienda.repository.EquipoRepository;
import com.dispenserlatienda.repository.ServicioItemRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/equipos")
public class EquipoController {

    private final EquipoRepository equipoRepository;
    private final ServicioItemRepository servicioItemRepository;

    public EquipoController(EquipoRepository equipoRepository,
                            ServicioItemRepository servicioItemRepository) {
        this.equipoRepository = equipoRepository;
        this.servicioItemRepository = servicioItemRepository;
    }

    /**
     * B) Autocompletado por número de serie.
     * Ejemplos:
     *  - /api/equipos/sugerencias?query=495
     *  - /api/equipos/sugerencias?query=495&sedeId=3
     */
    @GetMapping("/sugerencias")
    public List<EquipoSugerenciaResponse> sugerencias(
            @RequestParam("query") String query,
            @RequestParam(value = "sedeId", required = false) Long sedeId,
            @RequestParam(value = "limit", defaultValue = "10") int limit
    ) {
        if (query == null || query.trim().length() < 2) {
            return List.of(); // evita sugerencias con 1 carácter
        }

        var pageable = PageRequest.of(0, Math.min(Math.max(limit, 1), 20)); // 1..20

        List<Equipo> equipos = (sedeId == null)
                ? equipoRepository.findByNumeroSerieContainingIgnoreCase(query.trim(), pageable)
                : equipoRepository.findBySedeIdAndNumeroSerieContainingIgnoreCase(sedeId, query.trim(), pageable);

        return equipos.stream()
                .map(e -> new EquipoSugerenciaResponse(
                        e.getId(),
                        e.getNumeroSerie(),
                        e.getSede().getId()
                ))
                .toList();
    }

    /**
     * C) Verificar si un equipo está en garantía.
     * Usa el último ServicioItem (por garantiaHasta más grande).
     * Ejemplo:
     *  - /api/equipos/12/garantia
     */
    @GetMapping("/{equipoId}/garantia")
    public GarantiaResponse garantia(@PathVariable Long equipoId) {
        // si el equipo no existe, 404 "prolijo"
        Equipo equipo = equipoRepository.findById(equipoId)
                .orElseThrow(() -> new RuntimeException("Equipo no encontrado: " + equipoId));

        Optional<ServicioItem> ultimo = servicioItemRepository
                .findTopByEquipoIdOrderByGarantiaHastaDesc(equipoId);

        LocalDate hoy = LocalDate.now();

        if (ultimo.isEmpty() || ultimo.get().getGarantiaHasta() == null) {
            return new GarantiaResponse(equipo.getId(), equipo.getNumeroSerie(), false, null);
        }

        LocalDate garantiaHasta = ultimo.get().getGarantiaHasta();
        boolean enGarantia = !hoy.isAfter(garantiaHasta); // hoy <= garantiaHasta

        return new GarantiaResponse(equipo.getId(), equipo.getNumeroSerie(), enGarantia, garantiaHasta);
    }

    // ====== DTOs de respuesta (adentro del controller para ir rápido) ======

    public record EquipoSugerenciaResponse(Long equipoId, String numeroSerie, Long sedeId) {}

    public record GarantiaResponse(Long equipoId, String numeroSerie, boolean enGarantia, LocalDate garantiaHasta) {}
}
