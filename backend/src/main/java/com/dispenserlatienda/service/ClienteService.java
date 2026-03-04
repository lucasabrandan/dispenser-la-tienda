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
        // Validación de CUIL/DNI
        if (dto.cuilDni() != null && !dto.cuilDni().trim().isEmpty()) {
            clienteRepository.findByCuilDni(dto.cuilDni())
                    .ifPresent(c -> {
                        throw new IllegalArgumentException("Ya existe un cliente con el CUIL/DNI: " + dto.cuilDni());
                    });
        }

        // 💡 1. Usamos el constructor de 7 parámetros (agregando condicionIva)
        // 💡 2. Cambiamos razonSocialNombre() por nombre()
        Cliente nuevoCliente = new Cliente(
                dto.tipo(),
                dto.nombre(),
                dto.cuilDni(),
                dto.telefono(),
                dto.email(),
                dto.notas(),
                dto.condicionIva()
        );

        // 💡 3. Seteamos los campos de logística que no están en el constructor
        nuevoCliente.setCalle(dto.calle());
        nuevoCliente.setNumero(dto.numero());
        nuevoCliente.setPiso(dto.piso());
        nuevoCliente.setDepto(dto.depto());
        nuevoCliente.setLocalidad(dto.localidad());
        nuevoCliente.setProvincia(dto.provincia());
        nuevoCliente.setDireccion(dto.direccion());

        Cliente guardado = clienteRepository.save(nuevoCliente);
        return mapToDTO(guardado);
    }

    private ClienteDTO mapToDTO(Cliente cliente) {
        // Asegurate de que tu ClienteDTO (Record) tenga estos campos en este orden
        return new ClienteDTO(
                cliente.getId(),
                cliente.getClienteTipo(),
                cliente.getNombre(),
                cliente.getCuilDni(),
                cliente.getTelefono(),
                cliente.getEmail(),
                cliente.getNotas(),
                cliente.getCondicionIva(), // ✅ Agregado
                cliente.getCalle(),        // ✅ Agregado
                cliente.getNumero(),       // ✅ Agregado
                cliente.getPiso(),         // ✅ Agregado
                cliente.getDepto(),        // ✅ Agregado
                cliente.getLocalidad(),    // ✅ Agregado
                cliente.getProvincia(),    // ✅ Agregado
                cliente.getDireccion()     // ✅ Agregado
        );
    }
}