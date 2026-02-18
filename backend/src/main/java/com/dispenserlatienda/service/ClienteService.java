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
        // ✅ Validación de Negocio: CUIL único
        clienteRepository.findByCuilDni(dto.cuilDni())
                .ifPresent(c -> {
                    throw new IllegalArgumentException("Ya existe un cliente registrado con el CUIL/DNI: " + dto.cuilDni());
                });

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

    // Método helper para no repetir lógica de conversión
    private ClienteDTO mapToDTO(Cliente cliente) {
        return new ClienteDTO(
                cliente.getId(),
                cliente.getTipo(),
                cliente.getRazonSocialNombre(),
                cliente.getCuilDni(),
                cliente.getTelefono(),
                cliente.getEmail(),
                cliente.getNotas()
        );
    }
}