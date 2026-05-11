package com.dispenserlatienda.controller.radar;

import com.dispenserlatienda.dto.radar.RadarAlertaDTO;
import com.dispenserlatienda.service.radar.RadarService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/radar")
public class RadarController {

    private final RadarService radarService;

    public RadarController(RadarService radarService) {
        this.radarService = radarService;
    }

    @GetMapping("/alertas")
    public ResponseEntity<List<RadarAlertaDTO>> getAlertas() {
        return ResponseEntity.ok(radarService.generarAlertas());
    }
}
