package com.dispenserlatienda.controller.file;

import com.dispenserlatienda.service.servicio.FileStorageService;
import com.dispenserlatienda.service.servicio.R2StorageService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.net.URI;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Map;

@RestController
@RequestMapping("/api/uploads")
public class FileController {

    @Value("${storage.location}")
    private String storageLocation;

    @Autowired
    private FileStorageService fileStorageService;

    @Autowired
    private R2StorageService r2;

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Map<String, String>> subirArchivo(@RequestParam("file") MultipartFile file) {
        try {
            String nombreArchivo = fileStorageService.guardarArchivo(file);
            return ResponseEntity.ok(Map.of("filename", nombreArchivo));
        } catch (Exception e) {
            System.out.println("❌ Error subiendo archivo: " + e.getMessage());
            return ResponseEntity.internalServerError().build();
        }
    }

    // Archivos nuevos están en R2 → redirigir a URL pública.
    // Archivos viejos están en disco local → servirlos directamente (backward compat).
    @GetMapping("/{filename:.+}")
    public ResponseEntity<byte[]> servirArchivo(@PathVariable String filename) {
        try {
            Path filePath = Paths.get(storageLocation, filename);
            File file = filePath.toFile();

            if (file.exists()) {
                byte[] fileContent = Files.readAllBytes(filePath);
                String contentType = Files.probeContentType(filePath);
                if (contentType == null) contentType = "image/jpeg";
                return ResponseEntity.ok()
                        .contentType(MediaType.parseMediaType(contentType))
                        .header("Cache-Control", "no-store, no-cache, must-revalidate")
                        .body(fileContent);
            }

            // Archivo nuevo → redirigir a R2
            return ResponseEntity.status(302)
                    .location(URI.create(r2.urlPublica(filename)))
                    .build();

        } catch (Exception e) {
            System.out.println("❌ Error sirviendo archivo: " + e.getMessage());
            return ResponseEntity.internalServerError().build();
        }
    }
}
