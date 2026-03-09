package com.dispenserlatienda.service;

import com.dispenserlatienda.domain.Cliente;
import com.dispenserlatienda.domain.Sede;
import com.dispenserlatienda.dto.equipo.EquipoDTO;
import com.dispenserlatienda.dto.sede.SedeCreateDTO;
import com.dispenserlatienda.dto.sede.SedeDTO;
import com.dispenserlatienda.exception.ResourceNotFoundException;
import com.dispenserlatienda.repository.ClienteRepository;
import com.dispenserlatienda.repository.SedeRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class SedeService {

    private final SedeRepository sedeRepository;
    private final ClienteRepository clienteRepository;

    public SedeService(SedeRepository sedeRepository, ClienteRepository clienteRepository) {
        this.sedeRepository = sedeRepository;
        this.clienteRepository = clienteRepository;
    }

    @Transactional(readOnly = true)
    public List<SedeDTO> listarPorCliente(Long clienteId) {
        return sedeRepository.findByClienteId(clienteId).stream()
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
                cliente,
                dto.nombreSede(),
                dto.calle(),
                dto.numero(),
                dto.piso(),
                dto.depto(),
                dto.localidad(),
                dto.provincia(),
                dto.direccion(),
                dto.notas()
        );

        return mapToDTO(sedeRepository.save(nuevaSede));
    }

    // ✅ CAMBIO CLAVE: Ahora es PUBLIC para que ClienteService pueda usarlo
    public SedeDTO mapToDTO(Sede sede) {
        // 1. Convertimos las entidades Equipo a DTOs para evitar bucles JSON
        List<EquipoDTO> listaEquipos = sede.getEquipos().stream()
                .map(e -> new EquipoDTO(
                        e.getId(),
                        e.getNumeroSerie(),
                        e.getMarca(),
                        e.getModelo(),
                        e.getUbicacion(),
                        e.getObservaciones()
                )).toList();

        // 2. Devolvemos el DTO con los equipos adentro
        return new SedeDTO(
                sede.getId(),
                sede.getCliente().getId(),
                sede.getCliente().getNombre(),
                sede.getNombreSede(),
                sede.getCalle(),
                sede.getNumero(),
                sede.getPiso(),
                sede.getDepto(),
                sede.getLocalidad(),
                sede.getProvincia(),
                sede.getDireccion(),
                sede.getNotas(),
                listaEquipos // ⬅️ Este es el "pasaporte" para que lleguen a React
        );
    }
}