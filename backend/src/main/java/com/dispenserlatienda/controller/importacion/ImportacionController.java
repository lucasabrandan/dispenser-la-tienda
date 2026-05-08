package com.dispenserlatienda.controller.importacion;

import com.dispenserlatienda.dto.importacion.ImportResultDTO;
import com.dispenserlatienda.service.importacion.ImportacionService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/importacion")
public class ImportacionController {

    private final ImportacionService importacionService;

    public ImportacionController(ImportacionService importacionService) {
        this.importacionService = importacionService;
    }

    @PostMapping("/servicios")
    public ResponseEntity<ImportResultDTO> importarServicios(
        @RequestParam("file")      MultipartFile file,
        @RequestParam("tecnicoId") Long tecnicoId
    ) {
        try {
            ImportResultDTO result = importacionService.importarServiciosCSV(file, tecnicoId);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(
                new ImportResultDTO(0, 1, java.util.List.of("Error al procesar archivo: " + e.getMessage()))
            );
        }
    }
}
