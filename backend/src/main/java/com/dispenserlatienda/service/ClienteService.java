package com.dispenserlatienda.service;

import com.dispenserlatienda.domain.Cliente;
import com.dispenserlatienda.dto.cliente.ClienteCreateDTO;
import com.dispenserlatienda.dto.cliente.ClienteDTO;
import com.dispenserlatienda.exception.ResourceNotFoundException;
import com.dispenserlatienda.repository.ClienteRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class ClienteService {

    private final ClienteRepository clienteRepository;

    public ClienteService(ClienteRepository clienteRepository) {
        this.clienteRepository = clienteRepository;
    }

    @Transactional(readOnly = true)
    public List<ClienteDTO> listarTodos() {
        return clienteRepository.findAll().stream()
                .map(this::mapToDTO)
                .toList();
    }

    @Transactional(readOnly = true)
    public ClienteDTO buscarPorId(Long id) {
        return clienteRepository.findById(id)
                .map(this::mapToDTO)
                .orElseThrow(() -> new ResourceNotFoundException("Cliente no encontrado con ID: " + id));
    }

    @Transactional
    public ClienteDTO crear(ClienteCreateDTO dto) {
        // Validación: CUIL único solo si no está vacío o nulo
        if (dto.cuilDni() != null && !dto.cuilDni().trim().isEmpty()) {
            clienteRepository.findByCuilDni(dto.cuilDni())
                    .ifPresent(c -> {
                        throw new IllegalArgumentException("Ya existe un cliente con el CUIL/DNI: " + dto.cuilDni());
                    });
        }

        // 💡 Ahora el constructor encaja perfecto con la entidad Cliente
        Cliente nuevoCliente = new Cliente(
                dto.tipo(),
                dto.razonSocialNombre(),
                dto.cuilDni(),
                dto.telefono(),
                dto.email(),
                dto.notas()
        );

        Cliente guardado = clienteRepository.save(nuevoCliente);
        return mapToDTO(guardado);
    }

    private ClienteDTO mapToDTO(Cliente cliente) {
        return new ClienteDTO(
                cliente.getId(),
                cliente.getClienteTipo(),  // 💡 Usamos el getter correcto
                cliente.getNombre(),       // 💡 Usamos getNombre para estar prolijos
                cliente.getCuilDni(),
                cliente.getTelefono(),
                cliente.getEmail(),
                cliente.getNotas()         // 💡 Ahora sí existe en la entidad
        );
    }
}