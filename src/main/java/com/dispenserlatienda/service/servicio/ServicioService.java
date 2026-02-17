package com.dispenserlatienda.service.servicio;

import com.dispenserlatienda.domain.Equipo;
import com.dispenserlatienda.domain.Sede;
import com.dispenserlatienda.domain.servicio.Servicio;
import com.dispenserlatienda.domain.servicio.ServicioItem;
import com.dispenserlatienda.domain.servicio.ServicioTipo;
import com.dispenserlatienda.domain.servicio.TrabajoTipo;
import com.dispenserlatienda.domain.usuario.Usuario;
import com.dispenserlatienda.repository.EquipoRepository;
import com.dispenserlatienda.repository.SedeRepository;
import com.dispenserlatienda.repository.ServicioRepository;
import com.dispenserlatienda.repository.UsuarioRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

@Service
public class ServicioService {

    private final ServicioRepository servicioRepository;
    private final SedeRepository sedeRepository;
    private final UsuarioRepository usuarioRepository;
    private final EquipoRepository equipoRepository;

    public ServicioService(
            ServicioRepository servicioRepository,
            SedeRepository sedeRepository,
            UsuarioRepository usuarioRepository,
            EquipoRepository equipoRepository
    ) {
        this.servicioRepository = servicioRepository;
        this.sedeRepository = sedeRepository;
        this.usuarioRepository = usuarioRepository;
        this.equipoRepository = equipoRepository;
    }

    @Transactional
    public ServicioItem crearServicioConUnItem(
            Long sedeId,
            Long usuarioId,
            Long equipoId,
            LocalDate fecha,
            ServicioTipo servicioTipo,
            TrabajoTipo trabajoTipo,
            String trabajoRealizado
    ) {
        // 1. Validaciones de nulos/vacíos (Fail Fast)
        validarParametrosEntrada(fecha, servicioTipo, trabajoTipo, trabajoRealizado);

        // 2. Obtención de entidades
        Sede sede = sedeRepository.findById(sedeId)
                .orElseThrow(() -> new IllegalArgumentException("Sede no encontrada con ID: " + sedeId));

        Usuario usuario = usuarioRepository.findById(usuarioId)
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado con ID: " + usuarioId));

        Equipo equipo = equipoRepository.findById(equipoId)
                .orElseThrow(() -> new IllegalArgumentException("Equipo no encontrado con ID: " + equipoId));

        // 3. ✅ BLINDAJE DE INTEGRIDAD: Validar que el equipo pertenezca a la sede
        if (!equipo.getSede().getId().equals(sedeId)) {
            throw new IllegalArgumentException(String.format(
                    "Error de integridad: El equipo [%s] pertenece a la sede [%s], no a la sede [%s] enviada.",
                    equipo.getNumeroSerie(), equipo.getSede().getNombreSede(), sede.getNombreSede()
            ));
        }

        // 4. Creación del Agregado (Servicio + Item)
        Servicio servicio = new Servicio(sede, usuario, fecha, servicioTipo);

        ServicioItem item = new ServicioItem(equipo, trabajoTipo, trabajoRealizado);
        item.setGarantiaHasta(GarantiaCalculator.calcular(servicio.getFechaServicio(), trabajoTipo));

        // Sincronización bidireccional
        servicio.addItem(item);

        // 5. Persistencia (Cascade guarda el item automáticamente)
        Servicio servicioGuardado = servicioRepository.save(servicio);

        return servicioGuardado.getItems().get(0);
    }

    private void validarParametrosEntrada(LocalDate fecha, ServicioTipo sTipo, TrabajoTipo tTipo, String tRealizado) {
        if (fecha == null) throw new IllegalArgumentException("fechaServicio es obligatoria");
        if (sTipo == null) throw new IllegalArgumentException("servicioTipo es obligatorio");
        if (tTipo == null) throw new IllegalArgumentException("trabajoTipo es obligatorio");
        if (tRealizado == null || tRealizado.isBlank()) {
            throw new IllegalArgumentException("trabajoRealizado es obligatorio");
        }
    }
}