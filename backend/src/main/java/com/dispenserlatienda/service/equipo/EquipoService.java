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
}
