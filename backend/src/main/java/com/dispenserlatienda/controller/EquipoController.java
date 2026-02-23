package com.dispenserlatienda.controller;

import com.dispenserlatienda.domain.Equipo;
import com.dispenserlatienda.domain.Sede;
import com.dispenserlatienda.domain.servicio.ServicioItem;
import com.dispenserlatienda.dto.equipo.EquipoSugerenciaDTO;
import com.dispenserlatienda.dto.equipo.GarantiaStatusDTO;
import com.dispenserlatienda.exception.ResourceNotFoundException;
import com.dispenserlatienda.repository.EquipoRepository;
import com.dispenserlatienda.repository.SedeRepository;
import com.dispenserlatienda.repository.ServicioItemRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/equipos")
@CrossOrigin(origins = "http://localhost:3000")
public class EquipoController {

    private final EquipoRepository equipoRepository;
    private final ServicioItemRepository servicioItemRepository;
    private final SedeRepository sedeRepository;

    public EquipoController(EquipoRepository equipoRepository,
                            ServicioItemRepository servicioItemRepository,
                            SedeRepository sedeRepository) {
        this.equipoRepository = equipoRepository;
        this.servicioItemRepository = servicioItemRepository;
        this.sedeRepository = sedeRepository;
    }

    // 1. Listar todos
    @GetMapping
    public List<Equipo> listarTodos() {
        return equipoRepository.findAll();
    }

    // 2. CREAR EQUIPO
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Equipo crear(@RequestBody EquipoCreateDTO dto) {
        Sede sede = sedeRepository.findById(dto.sedeId())
                .orElseThrow(() -> new ResourceNotFoundException("Sede no encontrada con ID: " + dto.sedeId()));

        Equipo nuevo = new Equipo(
                sede,
                dto.marca() != null ? dto.marca() : "Genérica",
                dto.modelo() != null ? dto.modelo() : "Estándar",
                dto.numeroSerie(),
                dto.ubicacion() != null ? dto.ubicacion() : "",
                dto.observaciones() != null ? dto.observaciones() : ""
        );

        return equipoRepository.save(nuevo);
    }

    // 💡 NUEVO: 3. EDITAR EQUIPO
    @PutMapping("/{id}")
    public Equipo editar(@PathVariable Long id, @RequestBody EquipoCreateDTO dto) {
        Equipo equipo = equipoRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Equipo no encontrado"));

        equipo.setNumeroSerie(dto.numeroSerie());
        equipo.setMarca(dto.marca());
        equipo.setModelo(dto.modelo());
        equipo.setUbicacion(dto.ubicacion());
        equipo.setObservaciones(dto.observaciones());

        return equipoRepository.save(equipo);
    }

    // 💡 NUEVO: 4. ELIMINAR EQUIPO
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void eliminar(@PathVariable Long id) {
        equipoRepository.deleteById(id);
    }

    // 5. Autocompletado / Búsqueda
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
                        e.getId(), e.getNumeroSerie(), e.getModelo(),
                        e.getSede().getId(), e.getSede().getNombreSede()
                )).toList();
    }

    // 6. Verificar Garantía
    @GetMapping("/{equipoId}/garantia")
    public GarantiaStatusDTO garantia(@PathVariable Long equipoId) {
        Equipo equipo = equipoRepository.findById(equipoId)
                .orElseThrow(() -> new ResourceNotFoundException("Equipo no encontrado: " + equipoId));

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

    // DTO Actualizado
    public record EquipoCreateDTO(
            String numeroSerie,
            String modelo,
            String marca,
            Long sedeId,
            String ubicacion,
            String observaciones
    ) {
    }
}