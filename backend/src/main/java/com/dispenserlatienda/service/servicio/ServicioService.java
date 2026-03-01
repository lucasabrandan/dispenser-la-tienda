package com.dispenserlatienda.service.servicio;

import com.dispenserlatienda.domain.*;
import com.dispenserlatienda.domain.servicio.*;
import com.dispenserlatienda.domain.usuario.Usuario;
import com.dispenserlatienda.dto.servicio.*;
import com.dispenserlatienda.repository.*;
import com.dispenserlatienda.exception.ResourceNotFoundException;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Service
public class ServicioService {
    private final ServicioRepository servicioRepository;
    private final SedeRepository sedeRepository;
    private final UsuarioRepository usuarioRepository;
    private final EquipoRepository equipoRepository;
    private final ObjectMapper objectMapper;

    public ServicioService(ServicioRepository servicioRepository, SedeRepository sedeRepository,
                           UsuarioRepository usuarioRepository, EquipoRepository equipoRepository,
                           ObjectMapper objectMapper) {
        this.servicioRepository = servicioRepository;
        this.sedeRepository = sedeRepository;
        this.usuarioRepository = usuarioRepository;
        this.equipoRepository = equipoRepository;
        this.objectMapper = objectMapper;
    }

    @Transactional(readOnly = true)
    public List<ServicioDTO> listarTodos() {
        return servicioRepository.findAll().stream().map(this::mapToDTO).toList();
    }

    @Transactional
    public ServicioDTO crearServicioCompleto(ServicioCreateDTO dto) {
        Sede sede = sedeRepository.findById(dto.getSedeId())
                .orElseThrow(() -> new ResourceNotFoundException("Sede no encontrada"));

        Usuario usuario = usuarioRepository.findById(dto.getUsuarioId())
                .orElseGet(() -> usuarioRepository.findAll().get(0));

        // 🚀 Conversión manual de fecha para matar el Error 500
        LocalDate fechaReal = LocalDate.parse(dto.getFecha());
        Servicio servicio = new Servicio(sede, usuario, fechaReal, dto.getServicioTipo());

        servicio.setClienteNombre(dto.getClienteNombre());
        servicio.setSedeNombre(dto.getSedeNombre());
        servicio.setEstado(dto.getEstado() != null ? dto.getEstado() : "PRESUPUESTO");
        servicio.setFotoRemito(dto.getFotoRemito());

        for (var itemDto : dto.getItems()) {
            Equipo equipo = equipoRepository.findByNumeroSerie(itemDto.equipoSerial()).orElse(null);

            LocalDate garantia = (itemDto.garantiaHasta() != null && !itemDto.garantiaHasta().isEmpty())
                    ? LocalDate.parse(itemDto.garantiaHasta()) : null;

            ServicioItem nuevoItem = new ServicioItem(
                    equipo, itemDto.tecnico(), itemDto.costo(),
                    itemDto.costoInterno() != null ? itemDto.costoInterno() : BigDecimal.ZERO,
                    BigDecimal.ZERO, itemDto.metodoPago(), itemDto.trabajoRealizado(), garantia
            );
            nuevoItem.setCostoExtra(itemDto.costoExtra() != null ? itemDto.costoExtra() : BigDecimal.ZERO);

            // Guardar repuestos como JSON String en la base de datos
            try {
                if (itemDto.repuestosUsados() != null) {
                    nuevoItem.setRepuestosUsados(objectMapper.writeValueAsString(itemDto.repuestosUsados()));
                }
            } catch (JsonProcessingException e) { e.printStackTrace(); }

            servicio.addItem(nuevoItem);
        }
        return mapToDTO(servicioRepository.save(servicio));
    }

    @Transactional
    public ServicioDTO cambiarEstado(Long id, String nuevoEstado) {
        Servicio s = servicioRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("No existe"));
        s.setEstado(nuevoEstado);
        return mapToDTO(servicioRepository.save(s));
    }

    private ServicioDTO mapToDTO(Servicio s) {
        List<ServicioItemDTO> items = s.getItems().stream().map(i -> {
            List<RepuestoUsadoDTO> listaRepuestos = new ArrayList<>();
            try {
                if (i.getRepuestosUsados() != null && !i.getRepuestosUsados().isEmpty()) {
                    listaRepuestos = objectMapper.readValue(i.getRepuestosUsados(),
                            new TypeReference<List<RepuestoUsadoDTO>>(){});
                }
            } catch (JsonProcessingException e) { e.printStackTrace(); }

            return new ServicioItemDTO(
                    i.getEquipo() != null ? i.getEquipo().getId() : null,
                    i.getEquipo() != null ? i.getEquipo().getNumeroSerie() : "MOSTRADOR",
                    i.getEquipo() != null ? i.getEquipo().getUbicacion() : "MOSTRADOR",
                    i.getTecnico(), i.getCosto(), i.getCostoExtra(), i.getCostoInterno(),
                    i.getDescuento(), i.getMetodoPago(), i.getTrabajoRealizado(),
                    i.getGarantiaHasta(), listaRepuestos, i.getFotoAntes(), i.getFotoDespues()
            );
        }).toList();

        return new ServicioDTO(
                s.getId(), s.getFechaServicio(), s.getServicioTipo().name(),
                s.getClienteNombre(), s.getSedeNombre(), items, s.getEstado(), s.getFotoRemito()
        );
    }
}