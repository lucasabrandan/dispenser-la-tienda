package com.dispenserlatienda.controller;

import com.dispenserlatienda.dto.cliente.ClienteCreateDTO;
import com.dispenserlatienda.dto.cliente.ClienteDTO;
import com.dispenserlatienda.service.ClienteService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/clientes")
public class ClienteController {

    private final ClienteService clienteService;

    public ClienteController(ClienteService clienteService) {
        this.clienteService = clienteService;
    }

    @GetMapping
    public List<ClienteDTO> listar() {
        return clienteService.listarTodos();
    }

    @GetMapping("/{id}")
    public ClienteDTO obtenerPorId(@PathVariable Long id) {
        return clienteService.buscarPorId(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ClienteDTO crear(@RequestBody ClienteCreateDTO dto) {
        return clienteService.crear(dto);
    }
}