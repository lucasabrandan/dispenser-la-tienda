package com.dispenserlatienda.controller;

import com.dispenserlatienda.domain.Equipo;
import com.dispenserlatienda.domain.servicio.ServicioItem;
import com.dispenserlatienda.dto.equipo.EquipoSugerenciaDTO;
import com.dispenserlatienda.dto.equipo.GarantiaStatusDTO;
import com.dispenserlatienda.exception.ResourceNotFoundException;
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
     * Devuelve DTO con información de sede para evitar búsquedas extra en el front.
     */
    @GetMapping("/sugerencias")
    public List<EquipoSugerenciaDTO> sugerencias(
            @RequestParam("query") String query,
            @RequestParam(value = "sedeId", required = false) Long sedeId,
            @RequestParam(value = "limit", defaultValue = "10") int limit
    ) {
        if (query == null || query.trim().length() < 2) {
            return List.of();
        }

        var pageable = PageRequest.of(0, Math.min(Math.max(limit, 1), 20));

        List<Equipo> equipos = (sedeId == null)
                ? equipoRepository.findByNumeroSerieContainingIgnoreCase(query.trim(), pageable)
                : equipoRepository.findBySedeIdAndNumeroSerieContainingIgnoreCase(sedeId, query.trim(), pageable);

        return equipos.stream()
                .map(e -> new EquipoSugerenciaDTO(
                        e.getId(),
                        e.getNumeroSerie(),
                        e.getModelo(),
                        e.getSede().getId(),
                        e.getSede().getNombreSede()
                ))
                .toList();
    }

    /**
     * C) Verificar si un equipo está en garantía.
     */
    @GetMapping("/{equipoId}/garantia")
    public GarantiaStatusDTO garantia(@PathVariable Long equipoId) {
        Equipo equipo = equipoRepository.findById(equipoId)
                .orElseThrow(() -> new ResourceNotFoundException("Equipo no encontrado con ID: " + equipoId));

        Optional<ServicioItem> ultimo = servicioItemRepository
                .findTopByEquipoIdOrderByGarantiaHastaDesc(equipoId);

        LocalDate hoy = LocalDate.now();

        if (ultimo.isEmpty() || ultimo.get().getGarantiaHasta() == null) {
            return new GarantiaStatusDTO(equipo.getId(), equipo.getNumeroSerie(), false, null);
        }

        LocalDate garantiaHasta = ultimo.get().getGarantiaHasta();
        boolean enGarantia = !hoy.isAfter(garantiaHasta);

        return new GarantiaStatusDTO(equipo.getId(), equipo.getNumeroSerie(), enGarantia, garantiaHasta);
    }
}