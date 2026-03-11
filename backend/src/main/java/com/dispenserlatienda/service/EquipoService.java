package com.dispenserlatienda.service;

import com.dispenserlatienda.domain.Equipo;
import com.dispenserlatienda.domain.Sede;
import com.dispenserlatienda.dto.equipo.EquipoCreateDTO;
import com.dispenserlatienda.exception.ResourceNotFoundException;
import com.dispenserlatienda.repository.EquipoRepository;
import com.dispenserlatienda.repository.SedeRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

// Servicio para gestionar equipos/dispensers
// Implementa paginación para mejorar performance
@Service
public class EquipoService {

    private final EquipoRepository equipoRepository;
    private final SedeRepository sedeRepository;

    public EquipoService(EquipoRepository equipoRepository,
                         SedeRepository sedeRepository) {
        this.equipoRepository = equipoRepository;
        this.sedeRepository = sedeRepository;
    }

    // CAMBIO: Ahora devuelve Page<Equipo> en lugar de List<Equipo>
    // Parámetros: page=0 (primera página), size=20 (20 elementos)
    // Ejemplo: GET /api/equipos?page=0&size=20
    @Transactional(readOnly = true)
    public Page<Equipo> listarTodos(Pageable pageable) {
        return equipoRepository.findAll(pageable);
    }

    @Transactional
    public Equipo crear(EquipoCreateDTO dto) {
        // Validar que el número de serie no exista ya en la base de datos
        if (equipoRepository.existsByNumeroSerie(dto.numeroSerie())) {
            throw new IllegalArgumentException("El número de serie " + dto.numeroSerie() + " ya está registrado en otro equipo.");
        }

        Sede sede = sedeRepository.findById(dto.sedeId())
                .orElseThrow(() -> new ResourceNotFoundException("Sede no encontrada"));

        Equipo nuevo = new Equipo(
                sede,
                dto.marca() != null ? dto.marca() : "Genérica",
                dto.modelo() != null ? dto.modelo() : "Estándar",
                dto.numeroSerie(),
                dto.ubicacion(),
                dto.observaciones()
        );

        return equipoRepository.save(nuevo);
    }

    @Transactional
    public Equipo actualizar(Long id, EquipoCreateDTO dto) {
        Equipo equipo = equipoRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Equipo no encontrado"));

        // Validar si el nuevo S/N ya pertenece a OTRO equipo
        if (!equipo.getNumeroSerie().equals(dto.numeroSerie()) &&
                equipoRepository.existsByNumeroSerie(dto.numeroSerie())) {
            throw new IllegalArgumentException("El número de serie " + dto.numeroSerie() + " ya está en uso.");
        }

        equipo.setNumeroSerie(dto.numeroSerie());
        equipo.setMarca(dto.marca());
        equipo.setModelo(dto.modelo());
        equipo.setUbicacion(dto.ubicacion());
        equipo.setObservaciones(dto.observaciones());

        return equipoRepository.save(equipo);
    }

    @Transactional
    public void eliminar(Long id) {
        equipoRepository.deleteById(id);
    }
}