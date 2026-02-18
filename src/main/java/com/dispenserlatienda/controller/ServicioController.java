package com.dispenserlatienda.controller;

import com.dispenserlatienda.dto.servicio.ServicioCreateDTO;
import com.dispenserlatienda.dto.servicio.ServicioDTO;
import com.dispenserlatienda.service.servicio.ServicioService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/servicios")
public class ServicioController {

    private final ServicioService servicioService;

    public ServicioController(ServicioService servicioService) {
        this.servicioService = servicioService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ServicioDTO crear(@RequestBody ServicioCreateDTO dto) {
        return servicioService.crearServicioCompleto(dto);
    }
}