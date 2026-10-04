package com.dispenserlatienda.service.equipo;

import com.dispenserlatienda.domain.equipo.Equipo;
import com.dispenserlatienda.domain.sede.Sede;
import com.dispenserlatienda.dto.equipo.EquipoCreateDTO;
import com.dispenserlatienda.dto.equipo.EquipoDTO;
import com.dispenserlatienda.exception.ResourceNotFoundException;
import com.dispenserlatienda.repository.equipo.EquipoRepository;
import com.dispenserlatienda.repository.sede.SedeRepository;
import com.dispenserlatienda.repository.servicio.ServicioItemRepository;
import com.dispenserlatienda.repository.servicio.ServicioRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class EquipoService {

    private final EquipoRepository equipoRepository;
    private final SedeRepository sedeRepository;
    private final ServicioItemRepository servicioItemRepository;
    private final ServicioRepository servicioRepository;

    public EquipoService(EquipoRepository equipoRepository, SedeRepository sedeRepository,
                         ServicioItemRepository servicioItemRepository, ServicioRepository servicioRepository) {
        this.equipoRepository = equipoRepository;
        this.sedeRepository = sedeRepository;
        this.servicioItemRepository = servicioItemRepository;
        this.servicioRepository = servicioRepository;
    }

    @Transactional(readOnly = true)
    public Page<EquipoDTO> listarTodos(Pageable pageable) {
        return equipoRepository.findAll(pageable).map(this::mapToDTO);
    }

    @Transactional
    public Equipo crear(EquipoCreateDTO dto) {
        Sede sede = sedeRepository.findById(dto.sedeId())
                .orElseThrow(() -> new ResourceNotFoundException("Sede no encontrada con ID: " + dto.sedeId()));

        exigirSerieLibre(dto.numeroSerie(), null);
        Equipo nuevoEquipo = new Equipo(
                sede, dto.marca(), dto.modelo(), dto.numeroSerie(),
                dto.ubicacion(), dto.piso(), dto.sector(), dto.observaciones()
        );

        return equipoRepository.save(nuevoEquipo);
    }

    @Transactional
    public Equipo actualizar(Long id, EquipoCreateDTO dto) {
        Equipo equipo = equipoRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Equipo no encontrado con ID: " + id));

        Sede sede = sedeRepository.findById(dto.sedeId())
                .orElseThrow(() -> new ResourceNotFoundException("Sede no encontrada con ID: " + dto.sedeId()));

        equipo.setSede(sede);
        equipo.setMarca(dto.marca());
        equipo.setModelo(dto.modelo());
        exigirSerieLibre(dto.numeroSerie(), id);
        equipo.setNumeroSerie(dto.numeroSerie());
        equipo.setUbicacion(dto.ubicacion());
        equipo.setPiso(dto.piso());
        equipo.setSector(dto.sector());
        equipo.setObservaciones(dto.observaciones());

        return equipoRepository.save(equipo);
    }

    // ── ARCHIVAR (soft delete) ───────────────────────────────────────────────
    @Transactional
    public void archivar(Long id) {
        Equipo equipo = equipoRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Equipo no encontrado con ID: " + id));
        equipo.setActive(false);  // ✅ CAMBIO: setActivo → setActive
        equipoRepository.save(equipo);
    }

    // ── ELIMINAR DEFINITIVO (hard delete en cascada) ─────────────────────────
    @Transactional
    public void eliminarDefinitivo(Long id) {
        Equipo equipo = equipoRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Equipo no encontrado con ID: " + id));

        // 1. ELIMINAR ServicioItems asociados a este equipo
        servicioItemRepository.deleteByEquipoId(id);

        // 2. Eliminar el equipo
        equipoRepository.delete(equipo);
    }

    public EquipoDTO mapToDTO(Equipo equipo) {
        return new EquipoDTO(
                equipo.getId(), equipo.getSede().getId(), equipo.getNumeroSerie(),
                equipo.getMarca(), equipo.getModelo(), equipo.getUbicacion(),
                equipo.getPiso(), equipo.getSector(), equipo.getObservaciones()
        );
    }

    // ── RESTAURAR EQUIPO (reactivar) ───────────────────────────────────────────────
    @Transactional
    public void restaurar(Long id) {
        Equipo equipo = equipoRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Equipo no encontrado con ID: " + id));
        equipo.setActive(true);  // ✅ CAMBIO: setActivo → setActive
        equipoRepository.save(equipo);
    }

    /**
     * Próximo N/S libre para la base dada (ej. "MS290926"): devuelve la base si está libre,
     * si no MS290926A, MS290926B... `ocupados` son series ya usadas en el ticket actual
     * que todavía no se guardaron.
     */
    // Un N/S no se repite en todo el sistema (5-oct-2026)
    private void exigirSerieLibre(String serie, Long idPropio) {
        String s = Equipo.normalizarSerie(serie);
        if (s == null || s.equals("S/N") || s.equals("MOSTRADOR")) return;
        equipoRepository.findFirstByNumeroSerie(s).ifPresent(otro -> {
            if (idPropio == null || !otro.getId().equals(idPropio))
                throw new com.dispenserlatienda.exception.BusinessException("SERIE_DUPLICADA",
                        "El N/S " + s + " ya existe. Usá \"Generar N/S\" para obtener uno libre.");
        });
    }

    public String siguienteSerie(String base, java.util.Collection<String> ocupados) {
        String b = base == null ? "" : base.trim().toUpperCase().replaceAll("[^A-Z0-9]", "");
        if (b.isEmpty()) throw new IllegalArgumentException("Base de serie vacía");
        java.util.Set<String> usados = new java.util.HashSet<>();
        equipoRepository.seriesQueEmpiezanCon(b).forEach(x -> usados.add(x.toUpperCase()));
        if (ocupados != null) ocupados.forEach(x -> { if (x != null) usados.add(x.trim().toUpperCase()); });
        if (!usados.contains(b)) return b;
        for (char c = 'A'; c <= 'Z'; c++) {
            if (!usados.contains(b + c)) return b + c;
        }
        for (char c1 = 'A'; c1 <= 'Z'; c1++)
            for (char c2 = 'A'; c2 <= 'Z'; c2++)
                if (!usados.contains(b + c1 + c2)) return b + c1 + c2;
        throw new IllegalStateException("No quedan series libres para " + b);
    }
}
