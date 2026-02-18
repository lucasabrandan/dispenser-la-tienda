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

    public ServicioService(ServicioRepository servicioRepository,
                           SedeRepository sedeRepository,
                           UsuarioRepository usuarioRepository,
                           EquipoRepository equipoRepository) {
        this.servicioRepository = servicioRepository;
        this.sedeRepository = sedeRepository;
        this.usuarioRepository = usuarioRepository;
        this.equipoRepository = equipoRepository;
    }

    @Transactional
    public ServicioDTO crearServicioCompleto(ServicioCreateDTO dto) {
        // 1. Obtención y validación de cabecera
        Sede sede = sedeRepository.findById(dto.sedeId())
                .orElseThrow(() -> new ResourceNotFoundException("Sede no encontrada con ID: " + dto.sedeId()));

        Usuario usuario = usuarioRepository.findById(dto.usuarioId())
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado con ID: " + dto.usuarioId()));

        // 2. Creación del objeto raíz (Servicio)
        Servicio servicio = new Servicio(sede, usuario, dto.fecha(), dto.servicioTipo());
        servicio.setObservaciones(dto.observaciones());

        // 3. Procesamiento de ítems (Bucle de equipos atendidos)
        for (var itemDto : dto.items()) {
            Equipo equipo = equipoRepository.findById(itemDto.equipoId())
                    .orElseThrow(() -> new ResourceNotFoundException("Equipo no encontrado con ID: " + itemDto.equipoId()));

            // ✅ BLINDAJE DE INTEGRIDAD: Validar que el equipo pertenezca a la sede del servicio
            if (!equipo.getSede().getId().equals(dto.sedeId())) {
                throw new IllegalArgumentException(String.format(
                        "Error de integridad: El equipo [%s] no pertenece a la sede [%s].",
                        equipo.getNumeroSerie(), sede.getNombreSede()
                ));
            }

            // Crear ítem y calcular garantía
            ServicioItem item = new ServicioItem(equipo, itemDto.trabajoTipo(), itemDto.trabajoRealizado());
            item.setGarantiaHasta(GarantiaCalculator.calcular(servicio.getFechaServicio(), itemDto.trabajoTipo()));

            // Sincronización bidireccional
            servicio.addItem(item);
        }

        // 4. Persistencia única (Cascade guarda todos los ítems)
        Servicio guardado = servicioRepository.save(servicio);

        return mapToDTO(guardado);
    }

    private ServicioDTO mapToDTO(Servicio s) {
        List<ServicioItemDTO> itemDtos = s.getItems().stream()
                .map(i -> new ServicioItemDTO(
                        i.getEquipo().getId(),
                        i.getEquipo().getNumeroSerie(),
                        i.getTrabajoTipo(),
                        i.getGarantiaHasta()
                )).toList();

        return new ServicioDTO(
                s.getId(),
                s.getFechaServicio(),
                s.getServicioTipo(),
                s.getSede().getNombreSede(),
                itemDtos
        );
    }
}