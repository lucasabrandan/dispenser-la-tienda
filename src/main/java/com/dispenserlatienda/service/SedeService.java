package com.dispenserlatienda.service;

import com.dispenserlatienda.domain.Cliente;
import com.dispenserlatienda.domain.Sede;
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
        // 1. Validar que el cliente exista
        Cliente cliente = clienteRepository.findById(dto.clienteId())
                .orElseThrow(() -> new ResourceNotFoundException("Cliente no encontrado con ID: " + dto.clienteId()));

        // 2. Validar nombre duplicado para ese mismo cliente
        sedeRepository.findByClienteIdAndNombreSede(dto.clienteId(), dto.nombreSede())
                .ifPresent(s -> {
                    throw new IllegalArgumentException("El cliente ya tiene una sede llamada: " + dto.nombreSede());
                });

        Sede nuevaSede = new Sede(
                cliente,
                dto.nombreSede(),
                dto.direccion(),
                dto.localidad(),
                dto.notas()
        );

        return mapToDTO(sedeRepository.save(nuevaSede));
    }

    private SedeDTO mapToDTO(Sede sede) {
        return new SedeDTO(
                sede.getId(),
                sede.getCliente().getId(),
                sede.getCliente().getRazonSocialNombre(),
                sede.getNombreSede(),
                sede.getDireccion(),
                sede.getLocalidad(),
                sede.getNotas()
        );
    }
}