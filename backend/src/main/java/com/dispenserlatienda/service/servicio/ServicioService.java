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
import java.math.RoundingMode;
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
            Equipo equipo = equipoRepository.findByNumeroSerie(itemDto.equipoSerial())
                    .orElseThrow(() -> new ResourceNotFoundException("Serie no existe: " + itemDto.equipoSerial()));

            if (!equipo.getSede().getId().equals(sede.getId())) {
                throw new IllegalArgumentException("INTEGRIDAD FALLIDA: El dispenser " + equipo.getNumeroSerie() + " no pertenece a la sede " + sede.getNombreSede());
            }

            BigDecimal costoBase = itemDto.costo();
            BigDecimal montoDescuentoCalculado = BigDecimal.ZERO;
            String descRaw = (itemDto.descuento() != null) ? itemDto.descuento().trim() : "0";

            try {
                if (descRaw.endsWith("%")) {
                    BigDecimal porcentajeVal = new BigDecimal(descRaw.replace("%", "")).abs(); // .abs() evita negativos
                    montoDescuentoCalculado = costoBase.multiply(porcentajeVal).divide(new BigDecimal("100"), RoundingMode.HALF_UP);
                } else {
                    montoDescuentoCalculado = new BigDecimal(descRaw).abs(); // .abs() evita negativos
                }
            } catch (Exception e) {
                montoDescuentoCalculado = BigDecimal.ZERO;
            }

            if (montoDescuentoCalculado.compareTo(costoBase) > 0) montoDescuentoCalculado = costoBase;

            ServicioItem item = new ServicioItem(equipo, itemDto.tecnico(), costoBase, montoDescuentoCalculado, itemDto.metodoPago(), itemDto.trabajoRealizado(), itemDto.garantiaHasta());
            servicio.addItem(item);
        }
        return mapToDTO(servicioRepository.save(servicio));
    }

    private ServicioDTO mapToDTO(Servicio s) {
        List<ServicioItemDTO> items = s.getItems().stream()
                .map(i -> new ServicioItemDTO(
                        i.getEquipo().getId(), i.getEquipo().getNumeroSerie(), i.getTecnico(),
                        i.getCosto(), i.getDescuento(), i.getMetodoPago(), i.getTrabajoRealizado(), i.getGarantiaHasta()
                )).toList();
        return new ServicioDTO(s.getId(), s.getFechaServicio(), s.getServicioTipo(), s.getSede().getNombreSede(), items);
    }
}