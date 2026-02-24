package com.dispenserlatienda.controller;

import com.dispenserlatienda.domain.Cliente;
import com.dispenserlatienda.repository.ClienteRepository;
import jakarta.persistence.EntityManager; // 💡 NUEVO
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional; // 💡 NUEVO
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/clientes")
public class ClienteController {
    private final ClienteRepository repository;
    private final EntityManager entityManager; // 💡 El motor directo a la base de datos

    public ClienteController(ClienteRepository repository, EntityManager entityManager) {
        this.repository = repository;
        this.entityManager = entityManager;
    }

    @GetMapping
    public List<Cliente> listar() {
        return repository.findAll();
    }

    @PostMapping
    public Cliente crear(@RequestBody Cliente cliente) {
        return repository.save(cliente);
    }

    @PutMapping("/{id}")
    public Cliente editar(@PathVariable Long id, @RequestBody Cliente datos) {
        Cliente c = repository.findById(id).orElseThrow();
        c.setNombre(datos.getNombre());
        c.setCuilDni(datos.getCuilDni());
        c.setTelefono(datos.getTelefono());
        c.setEmail(datos.getEmail());
        return repository.save(c);
    }

    // 💡 SOLUCIÓN PROFESIONAL: Borrado en Cascada Total (Hard Delete)
    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<?> eliminarClienteYTodoSuHistorial(@PathVariable Long id) {
        try {
            // 1. Destruimos los items facturados de los dispensers de este cliente
            entityManager.createNativeQuery("DELETE FROM servicio_item WHERE equipo_id IN (SELECT id FROM equipo WHERE sede_id IN (SELECT id FROM sede WHERE cliente_id = ?))")
                    .setParameter(1, id).executeUpdate();

            // 2. Destruimos los tickets/presupuestos de este cliente
            entityManager.createNativeQuery("DELETE FROM servicio WHERE sede_id IN (SELECT id FROM sede WHERE cliente_id = ?)")
                    .setParameter(1, id).executeUpdate();

            // 3. Destruimos sus dispensers
            entityManager.createNativeQuery("DELETE FROM equipo WHERE sede_id IN (SELECT id FROM sede WHERE cliente_id = ?)")
                    .setParameter(1, id).executeUpdate();

            // 4. Destruimos sus sedes/domicilios
            entityManager.createNativeQuery("DELETE FROM sede WHERE cliente_id = ?")
                    .setParameter(1, id).executeUpdate();

            // 5. Finalmente, borramos al cliente
            repository.deleteById(id);

            return ResponseEntity.noContent().build();
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error crítico al intentar formatear los datos del cliente: " + e.getMessage());
        }
    }
}