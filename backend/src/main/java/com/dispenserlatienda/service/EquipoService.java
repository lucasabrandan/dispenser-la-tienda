package com.dispenserlatienda.service;

import com.dispenserlatienda.domain.Equipo;
import com.dispenserlatienda.domain.Sede;
import com.dispenserlatienda.dto.equipo.EquipoCreateDTO;
import com.dispenserlatienda.exception.ResourceNotFoundException;
import com.dispenserlatienda.repository.EquipoRepository;
import com.dispenserlatienda.repository.SedeRepository;
import com.dispenserlatienda.repository.ServicioItemRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class EquipoService {

    private final EquipoRepository equipoRepository;
    private final SedeRepository sedeRepository;

    public EquipoService(EquipoRepository equipoRepository,
                         SedeRepository sedeRepository,
                         ServicioItemRepository servicioItemRepository) {
        this.equipoRepository = equipoRepository;
        this.sedeRepository = sedeRepository;
    }

    @Transactional(readOnly = true)
    public List<Equipo> listarTodos() {
        return equipoRepository.findAll();
    }

    @Transactional
    public Equipo crear(EquipoCreateDTO dto) {
        // 1. 🛡️ Mejora: Validar que el S/N no exista ya en la base de datos
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