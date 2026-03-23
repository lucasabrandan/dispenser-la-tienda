package com.dispenserlatienda.service.sede;

import com.dispenserlatienda.domain.cliente.Cliente;
import com.dispenserlatienda.domain.equipo.Equipo;
import com.dispenserlatienda.domain.sede.Sede;
import com.dispenserlatienda.dto.equipo.EquipoDTO;
import com.dispenserlatienda.dto.sede.SedeCreateDTO;
import com.dispenserlatienda.dto.sede.SedeDTO;
import com.dispenserlatienda.exception.ResourceNotFoundException;
import com.dispenserlatienda.repository.cliente.ClienteRepository;
import com.dispenserlatienda.repository.equipo.EquipoRepository;
import com.dispenserlatienda.repository.sede.SedeRepository;
import com.dispenserlatienda.repository.servicio.ServicioItemRepository;
import com.dispenserlatienda.repository.servicio.ServicioRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class SedeService {

    private final SedeRepository sedeRepository;
    private final ClienteRepository clienteRepository;
    private final EquipoRepository equipoRepository;
    private final ServicioItemRepository servicioItemRepository;
    private final ServicioRepository servicioRepository;

    public SedeService(SedeRepository sedeRepository, ClienteRepository clienteRepository,
                       EquipoRepository equipoRepository, ServicioItemRepository servicioItemRepository,
                       ServicioRepository servicioRepository) {
        this.sedeRepository = sedeRepository;
        this.clienteRepository = clienteRepository;
        this.equipoRepository = equipoRepository;
        this.servicioItemRepository = servicioItemRepository;
        this.servicioRepository = servicioRepository;
    }

    @Transactional(readOnly = true)
    public List<SedeDTO> listarPorCliente(Long clienteId) {
        // Solo devuelve sedes activas
        return sedeRepository.findByClienteIdAndActivaTrue(clienteId).stream()
                .map(this::mapToDTO)
                .toList();
    }

    @Transactional
    public SedeDTO crear(SedeCreateDTO dto) {
        Cliente cliente = clienteRepository.findById(dto.clienteId())
                .orElseThrow(() -> new ResourceNotFoundException("Cliente no encontrado con ID: " + dto.clienteId()));

        sedeRepository.findByClienteIdAndNombreSede(dto.clienteId(), dto.nombreSede())
                .ifPresent(s -> {
                    throw new IllegalArgumentException("El cliente ya tiene una sede llamada: " + dto.nombreSede());
                });

        Sede nuevaSede = new Sede(
                cliente, dto.nombreSede(), dto.calle(), dto.numero(), dto.piso(),
                dto.depto(), dto.localidad(), dto.provincia(), dto.direccion(), dto.notas()
        );

        return mapToDTO(sedeRepository.save(nuevaSede));
    }

    // ── ARCHIVAR (soft delete) ───────────────────────────────────────────────
    @Transactional
    public void archivar(Long id) {
        Sede sede = sedeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Sede no encontrada con ID: " + id));
        sede.setActiva(false);
        sedeRepository.save(sede);
    }

    // ── ELIMINAR DEFINITIVO (hard delete en cascada) ─────────────────────────
    @Transactional
    public void eliminarDefinitivo(Long id) {
        sedeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Sede no encontrada con ID: " + id));

        // 1. Desvincular ServicioItems de los equipos de esta sede
        List<Equipo> equipos = equipoRepository.findBySedeId(id);
        for (Equipo equipo : equipos) {
            servicioItemRepository.desvincularEquipo(equipo.getId());
            equipoRepository.delete(equipo);
        }

        // 2. Borrar servicios que referencian esta sede
        List<com.dispenserlatienda.domain.servicio.Servicio> servicios = servicioRepository.findBySedeId(id);
        servicioRepository.deleteAll(servicios);

        // 3. Borrar la sede
        sedeRepository.deleteById(id);
    }

    public SedeDTO mapToDTO(Sede sede) {
        List<EquipoDTO> listaEquipos = sede.getEquipos().stream()
                .map(e -> new EquipoDTO(
                        e.getId(), e.getNumeroSerie(), e.getMarca(),
                        e.getModelo(), e.getUbicacion(), e.getObservaciones()
                )).toList();

        return new SedeDTO(
                sede.getId(), sede.getCliente().getId(), sede.getCliente().getNombre(),
                sede.getNombreSede(), sede.getCalle(), sede.getNumero(), sede.getPiso(),
                sede.getDepto(), sede.getLocalidad(), sede.getProvincia(),
                sede.getDireccion(), sede.getNotas(), listaEquipos
        );
    }
}