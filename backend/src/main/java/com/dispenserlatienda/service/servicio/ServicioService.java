package com.dispenserlatienda.service.servicio;

import com.dispenserlatienda.domain.Equipo;
import com.dispenserlatienda.domain.Sede;
import com.dispenserlatienda.domain.servicio.Servicio;
import com.dispenserlatienda.domain.servicio.ServicioItem;
import com.dispenserlatienda.domain.usuario.Usuario;
import com.dispenserlatienda.dto.servicio.ServicioCreateDTO;
import com.dispenserlatienda.dto.servicio.ServicioDTO;
import com.dispenserlatienda.dto.servicio.ServicioItemDTO;
import com.dispenserlatienda.exception.ResourceNotFoundException;
import com.dispenserlatienda.repository.EquipoRepository;
import com.dispenserlatienda.repository.SedeRepository;
import com.dispenserlatienda.repository.ServicioRepository;
import com.dispenserlatienda.repository.UsuarioRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class ServicioService {
    private final ServicioRepository servicioRepository;
    private final SedeRepository sedeRepository;
    private final UsuarioRepository usuarioRepository;
    private final EquipoRepository equipoRepository;

    public ServicioService(ServicioRepository servicioRepository, SedeRepository sedeRepository, UsuarioRepository usuarioRepository, EquipoRepository equipoRepository) {
        this.servicioRepository = servicioRepository;
        this.sedeRepository = sedeRepository;
        this.usuarioRepository = usuarioRepository;
        this.equipoRepository = equipoRepository;
    }

    @Transactional(readOnly = true)
    public List<ServicioDTO> listarTodos() {
        return servicioRepository.findAll().stream().map(this::mapToDTO).toList();
    }

    @Transactional
    public ServicioDTO crearServicioCompleto(ServicioCreateDTO dto) {
        Sede sede = sedeRepository.findById(dto.sedeId()).orElseThrow(() -> new ResourceNotFoundException("Sede no encontrada"));
        Usuario usuario = usuarioRepository.findById(dto.usuarioId()).orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado"));
        Servicio servicio = new Servicio(sede, usuario, dto.fecha(), dto.servicioTipo());

        for (var itemDto : dto.items()) {
            Equipo equipo = equipoRepository.findById(itemDto.equipoId()).orElseThrow(() -> new ResourceNotFoundException("Equipo no encontrado"));

            // Blindaje de integridad
            if (!equipo.getSede().getId().equals(sede.getId())) {
                throw new IllegalArgumentException("Integridad fallida: el equipo " + equipo.getNumeroSerie() + " no pertenece a la sede seleccionada.");
            }

            ServicioItem item = new ServicioItem(
                    equipo,
                    itemDto.tecnico(),
                    itemDto.costo(),
                    itemDto.trabajoRealizado(),
                    itemDto.garantiaHasta()
            );
            servicio.addItem(item);
        }
        return mapToDTO(servicioRepository.save(servicio));
    }

    private ServicioDTO mapToDTO(Servicio s) {
        // Mapeo corregido para enviar técnico y costo al React
        List<ServicioItemDTO> items = s.getItems().stream()
                .map(i -> new ServicioItemDTO(
                        i.getEquipo().getId(),
                        i.getEquipo().getNumeroSerie(),
                        i.getTecnico(),          // 👈 Datos reales
                        i.getCosto(),            // 👈 Datos reales
                        i.getTrabajoRealizado(),
                        i.getGarantiaHasta()
                )).toList();

        return new ServicioDTO(
                s.getId(),
                s.getFechaServicio(),
                s.getServicioTipo(),
                s.getSede().getNombreSede(),
                items
        );
    }
}