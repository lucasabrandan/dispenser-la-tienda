package com.dispenserlatienda.service.servicio;

import com.dispenserlatienda.domain.*;
import com.dispenserlatienda.domain.servicio.*;
import com.dispenserlatienda.domain.usuario.Usuario;
import com.dispenserlatienda.dto.servicio.*;
import com.dispenserlatienda.repository.*;
import com.dispenserlatienda.exception.ResourceNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.util.List;

@Service
public class ServicioService {
    private final ServicioRepository servicioRepository;
    private final SedeRepository sedeRepository;
    private final UsuarioRepository usuarioRepository;
    private final EquipoRepository equipoRepository;

    public ServicioService(ServicioRepository servicioRepository, SedeRepository sedeRepository,
                           UsuarioRepository usuarioRepository, EquipoRepository equipoRepository) {
        this.servicioRepository = servicioRepository;
        this.sedeRepository = sedeRepository;
        this.equipoRepository = equipoRepository;
        this.usuarioRepository = usuarioRepository;
    }

    @Transactional(readOnly = true)
    public List<ServicioDTO> listarTodos() {
        return servicioRepository.findAll().stream().map(this::mapToDTO).toList();
    }

    @Transactional
    public ServicioDTO crearServicioCompleto(ServicioCreateDTO dto) {
        Sede sede = sedeRepository.findById(dto.sedeId())
                .orElseThrow(() -> new ResourceNotFoundException("Sede no encontrada"));
        Usuario usuario = usuarioRepository.findById(dto.usuarioId())
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado"));

        Servicio servicio = new Servicio(sede, usuario, dto.fecha(), dto.servicioTipo());
        servicio.setEstado(dto.estado() != null ? dto.estado() : "VENTA");

        for (var itemDto : dto.items()) {
            Equipo equipo = equipoRepository.findByNumeroSerie(itemDto.equipoSerial())
                    .orElseThrow(() -> new ResourceNotFoundException("Serie no encontrada"));

            if (itemDto.costo().compareTo(BigDecimal.ZERO) < 0) {
                throw new IllegalArgumentException("ERROR CRÍTICO: El costo no puede ser negativo.");
            }

            BigDecimal costoInterno = itemDto.costoInterno() != null ? itemDto.costoInterno() : BigDecimal.ZERO;

            ServicioItem nuevoItem = new ServicioItem(equipo, itemDto.tecnico(), itemDto.costo(), costoInterno, BigDecimal.ZERO,
                    itemDto.metodoPago(), itemDto.trabajoRealizado(), itemDto.garantiaHasta());

            nuevoItem.setFotoAntes(itemDto.fotoAntes());
            nuevoItem.setFotoDespues(itemDto.fotoDespues());

            servicio.addItem(nuevoItem);
        }
        return mapToDTO(servicioRepository.save(servicio));
    }

    @Transactional
    public ServicioDTO cambiarEstado(Long id, String nuevoEstado) {
        Servicio servicio = servicioRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Servicio no encontrado con ID: " + id));

        servicio.setEstado(nuevoEstado);
        return mapToDTO(servicioRepository.save(servicio));
    }

    private ServicioDTO mapToDTO(Servicio s) {
        List<ServicioItemDTO> items = s.getItems().stream()
                .map(i -> new ServicioItemDTO(
                        i.getEquipo().getId(),
                        i.getEquipo().getNumeroSerie(),
                        i.getEquipo().getUbicacion(),
                        i.getTecnico(),
                        i.getCosto(),
                        i.getCostoInterno(),
                        i.getDescuento(),
                        i.getMetodoPago(),
                        i.getTrabajoRealizado(),
                        i.getGarantiaHasta(),
                        i.getFotoAntes(),
                        i.getFotoDespues()
                )).toList();

        // 💡 CORRECCIÓN ACÁ: s.getServicioTipo().name()
        return new ServicioDTO(
                s.getId(),
                s.getFechaServicio(),
                s.getServicioTipo() != null ? s.getServicioTipo().name() : null,
                s.getSede().getCliente().getNombre(),
                s.getSede().getNombreSede(),
                items,
                s.getEstado()
        );
    }
}