package com.dispenserlatienda.controller;

import com.dispenserlatienda.domain.Repuesto;
import com.dispenserlatienda.repository.RepuestoRepository;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/repuestos")
public class RepuestoController {
    private final RepuestoRepository repository;
    public RepuestoController(RepuestoRepository repository) { this.repository = repository; }
    @GetMapping
    public List<Repuesto> listar() { return repository.findAll(); }
}