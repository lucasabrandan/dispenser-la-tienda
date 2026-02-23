package com.dispenserlatienda.controller;

import com.dispenserlatienda.domain.Cliente;
import com.dispenserlatienda.repository.ClienteRepository;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/clientes")
public class ClienteController {
    private final ClienteRepository repository;
    public ClienteController(ClienteRepository repository) { this.repository = repository; }

    @GetMapping
    public List<Cliente> listar() { return repository.findAll(); }

    @PostMapping
    public Cliente crear(@RequestBody Cliente cliente) { return repository.save(cliente); }

    @PutMapping("/{id}")
    public Cliente editar(@PathVariable Long id, @RequestBody Cliente datos) {
        Cliente c = repository.findById(id).orElseThrow();
        c.setNombre(datos.getNombre());
        c.setCuilDni(datos.getCuilDni());
        c.setTelefono(datos.getTelefono());
        c.setEmail(datos.getEmail());
        return repository.save(c);
    }

    @DeleteMapping("/{id}")
    public void eliminar(@PathVariable Long id) { repository.deleteById(id); }
}