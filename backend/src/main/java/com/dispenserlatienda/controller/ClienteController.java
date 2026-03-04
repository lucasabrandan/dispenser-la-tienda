package com.dispenserlatienda.controller;

import com.dispenserlatienda.domain.Cliente;
import com.dispenserlatienda.repository.ClienteRepository;
import jakarta.persistence.EntityManager;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/clientes")
public class ClienteController {
    private final ClienteRepository repository;
    private final EntityManager entityManager;

    public ClienteController(ClienteRepository repository, EntityManager entityManager) {
        this.repository = repository;
        this.entityManager = entityManager;
    }

    @GetMapping
    public List<Cliente> listar() {
        return repository.findAll();
    }

    @PostMapping
    @Transactional
    public Cliente crear(@RequestBody Cliente cliente) {
        // Spring mapeará automáticamente los campos si los nombres coinciden
        return repository.save(cliente);
    }

    @PutMapping("/{id}")
    @Transactional
    public Cliente editar(@PathVariable Long id, @RequestBody Cliente datos) {
        Cliente c = repository.findById(id).orElseThrow();

        // --- Datos Básicos ---
        c.setNombre(datos.getNombre());
        c.setCuilDni(datos.getCuilDni());
        c.setTelefono(datos.getTelefono());
        c.setEmail(datos.getEmail());
        c.setNotas(datos.getNotas());
        c.setClienteTipo(datos.getClienteTipo());

        // --- 📍 Datos Logísticos (Mejora para GPS) ---
        // Estos son los que React manda ahora y antes Java ignoraba
        c.setCalle(datos.getCalle());
        c.setNumero(datos.getNumero());
        c.setPiso(datos.getPiso());
        c.setDepto(datos.getDepto());
        c.setLocalidad(datos.getLocalidad());
        c.setProvincia(datos.getProvincia());
        c.setDireccion(datos.getDireccion()); // El string combinado que armamos en JS

        return repository.save(c);
    }

    // 💡 Borrado en Cascada Total (Hard Delete) - Tu lógica pro se mantiene
    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<?> eliminarClienteYTodoSuHistorial(@PathVariable Long id) {
        try {
            // 1. Items facturados
            entityManager.createNativeQuery("DELETE FROM servicio_item WHERE equipo_id IN (SELECT id FROM equipo WHERE sede_id IN (SELECT id FROM sede WHERE cliente_id = ?))")
                    .setParameter(1, id).executeUpdate();

            // 2. Tickets
            entityManager.createNativeQuery("DELETE FROM servicio WHERE sede_id IN (SELECT id FROM sede WHERE cliente_id = ?)")
                    .setParameter(1, id).executeUpdate();

            // 3. Dispensers
            entityManager.createNativeQuery("DELETE FROM equipo WHERE sede_id IN (SELECT id FROM sede WHERE cliente_id = ?)")
                    .setParameter(1, id).executeUpdate();

            // 4. Sedes
            entityManager.createNativeQuery("DELETE FROM sede WHERE cliente_id = ?")
                    .setParameter(1, id).executeUpdate();

            // 5. Cliente
            repository.deleteById(id);

            return ResponseEntity.noContent().build();
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error crítico al intentar eliminar: " + e.getMessage());
        }
    }
}