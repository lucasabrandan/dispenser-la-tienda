package com.dispenserlatienda.service;

import com.dispenserlatienda.domain.Cliente;
import com.dispenserlatienda.domain.CondicionIva;
import com.dispenserlatienda.dto.cliente.ClienteCreateDTO;
import com.dispenserlatienda.dto.cliente.ClienteDTO;
import com.dispenserlatienda.dto.sede.SedeDTO;
import com.dispenserlatienda.exception.ResourceNotFoundException;
import com.dispenserlatienda.repository.ClienteRepository;
import jakarta.persistence.EntityManager;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

// Servicio para gestionar clientes
// Implementa paginación para mejorar performance con muchos registros
@Service
public class ClienteService {

    private final ClienteRepository clienteRepository;
    private final EntityManager entityManager;
    private final SedeService sedeService;

    public ClienteService(ClienteRepository clienteRepository,
                          EntityManager entityManager,
                          SedeService sedeService) {
        this.clienteRepository = clienteRepository;
        this.entityManager = entityManager;
        this.sedeService = sedeService;
    }

    // CAMBIO: Ahora devuelve Page<ClienteDTO> en lugar de List<ClienteDTO>
    // Parámetros: page=0 (primera página), size=20 (20 elementos), sort=nombre,asc
    // Ejemplo: GET /api/clientes?page=0&size=20&sort=nombre,asc
    @Transactional(readOnly = true)
    public Page<ClienteDTO> listarTodos(Pageable pageable) {
        return clienteRepository.findAll(pageable)
                .map(this::mapToDTO);
    }

    @Transactional(readOnly = true)
    public ClienteDTO buscarPorId(Long id) {
        return clienteRepository.findById(id)
                .map(this::mapToDTO)
                .orElseThrow(() -> new ResourceNotFoundException("Cliente no encontrado con ID: " + id));
    }

    @Transactional
    public ClienteDTO crear(ClienteCreateDTO dto) {
        // Validar que no exista cliente con el mismo CUIL/DNI
        if (dto.cuilDni() != null && !dto.cuilDni().trim().isEmpty()) {
            clienteRepository.findByCuilDni(dto.cuilDni()).ifPresent(c -> {
                throw new IllegalArgumentException("Ya existe un cliente con el CUIL/DNI: " + dto.cuilDni());
            });
        }

        Cliente cliente = new Cliente(
                dto.clienteTipo(),
                dto.nombre(),
                dto.cuilDni(),
                dto.telefono(),
                dto.email(),
                dto.notas(),
                dto.condicionIva()
        );

        mapearDatosLogistica(cliente, dto);
        return mapToDTO(clienteRepository.save(cliente));
    }

    @Transactional
    public ClienteDTO actualizar(Long id, ClienteCreateDTO dto) {
        Cliente cliente = clienteRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("No existe el cliente con ID: " + id));

        cliente.setNombre(dto.nombre());
        cliente.setCuilDni(dto.cuilDni());
        cliente.setTelefono(dto.telefono());
        cliente.setEmail(dto.email());
        cliente.setNotas(dto.notas());
        cliente.setClienteTipo(dto.clienteTipo());
        cliente.setCondicionIva(dto.condicionIva());

        mapearDatosLogistica(cliente, dto);
        return mapToDTO(clienteRepository.save(cliente));
    }

    @Transactional
    public void eliminarEnCascada(Long id) {
        // Borrado en cascada de todas las entidades relacionadas
        // Primero elimina items de servicio, luego servicios, luego equipos, luego sedes
        entityManager.createNativeQuery("DELETE FROM servicio_items WHERE servicio_id IN (SELECT id FROM servicio WHERE sede_id IN (SELECT id FROM sede WHERE cliente_id = ?))").setParameter(1, id).executeUpdate();
        entityManager.createNativeQuery("DELETE FROM servicio_item WHERE equipo_id IN (SELECT id FROM equipo WHERE sede_id IN (SELECT id FROM sede WHERE cliente_id = ?))").setParameter(1, id).executeUpdate();
        entityManager.createNativeQuery("DELETE FROM servicio WHERE sede_id IN (SELECT id FROM sede WHERE cliente_id = ? )").setParameter(1, id).executeUpdate();
        entityManager.createNativeQuery("DELETE FROM equipo WHERE sede_id IN (SELECT id FROM sede WHERE cliente_id = ? )").setParameter(1, id).executeUpdate();
        entityManager.createNativeQuery("DELETE FROM sede WHERE cliente_id = ?").setParameter(1, id).executeUpdate();
        clienteRepository.deleteById(id);
    }

    private void mapearDatosLogistica(Cliente cliente, ClienteCreateDTO dto) {
        cliente.setCalle(dto.calle());
        cliente.setNumero(dto.numero());
        cliente.setPiso(dto.piso());
        cliente.setDepto(dto.depto());
        cliente.setLocalidad(dto.localidad());
        cliente.setProvincia(dto.provincia());
        cliente.setDireccion(dto.direccion());
    }

    // Convierte entidad Cliente a DTO para enviar al frontend
    private ClienteDTO mapToDTO(Cliente cliente) {
        List<SedeDTO> sedesDTO = cliente.getSedes().stream()
                .map(sedeService::mapToDTO)
                .toList();

        // Convertir CondicionIva enum a String para el DTO
        String condicionIvaStr = cliente.getCondicionIva() != null
                ? cliente.getCondicionIva().name()
                : "CONSUMIDOR_FINAL";

        return new ClienteDTO(
                cliente.getId(),
                cliente.getClienteTipo(),
                cliente.getNombre(),
                cliente.getCuilDni(),
                cliente.getTelefono(),
                cliente.getEmail(),
                cliente.getNotas(),
                condicionIvaStr,
                cliente.getCalle(),
                cliente.getNumero(),
                cliente.getPiso(),
                cliente.getDepto(),
                cliente.getLocalidad(),
                cliente.getProvincia(),
                cliente.getDireccion(),
                sedesDTO
        );
    }
}