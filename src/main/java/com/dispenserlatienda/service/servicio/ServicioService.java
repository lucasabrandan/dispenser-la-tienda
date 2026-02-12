package com.dispenserlatienda.service.servicio;

import com.dispenserlatienda.domain.Equipo;
import com.dispenserlatienda.domain.servicio.*;
import com.dispenserlatienda.domain.Sede;
import com.dispenserlatienda.domain.usuario.Usuario;
import com.dispenserlatienda.repository.EquipoRepository;
import com.dispenserlatienda.repository.SedeRepository;
import com.dispenserlatienda.repository.UsuarioRepository;
import com.dispenserlatienda.repository.ServicioItemRepository;
import com.dispenserlatienda.repository.ServicioRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

@Service
public class ServicioService {

    private final ServicioRepository servicioRepository;
    private final ServicioItemRepository servicioItemRepository;
    private final SedeRepository sedeRepository;
    private final UsuarioRepository usuarioRepository;
    private final EquipoRepository equipoRepository;

    public ServicioService(ServicioRepository servicioRepository,
                           ServicioItemRepository servicioItemRepository,
                           SedeRepository sedeRepository,
                           UsuarioRepository usuarioRepository,
                           EquipoRepository equipoRepository) {
        this.servicioRepository = servicioRepository;
        this.servicioItemRepository = servicioItemRepository;
        this.sedeRepository = sedeRepository;
        this.usuarioRepository = usuarioRepository;
        this.equipoRepository = equipoRepository;
    }

    @Transactional
    public ServicioItem crearServicioConUnItem(Long sedeId,
                                               Long usuarioId,
                                               Long equipoId,
                                               LocalDate fecha,
                                               ServicioTipo servicioTipo,
                                               TrabajoTipo trabajoTipo,
                                               String trabajoRealizado) {

        Sede sede = sedeRepository.findById(sedeId).orElseThrow();
        Usuario usuario = usuarioRepository.findById(usuarioId).orElseThrow();
        Equipo equipo = equipoRepository.findById(equipoId).orElseThrow();

        Servicio servicio = new Servicio(sede, usuario, fecha, servicioTipo);
        servicioRepository.save(servicio);

        ServicioItem item = new ServicioItem(servicio, equipo, trabajoTipo, trabajoRealizado);
        item.setGarantiaHasta(GarantiaCalculator.calcular(fecha, trabajoTipo));

        return servicioItemRepository.save(item);
    }
}
