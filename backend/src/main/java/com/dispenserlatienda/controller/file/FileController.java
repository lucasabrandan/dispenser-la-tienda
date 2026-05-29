package com.dispenserlatienda.controller.file;

import com.dispenserlatienda.service.servicio.FileStorageService;
import com.dispenserlatienda.service.servicio.R2StorageService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Map;

@RestController
@RequestMapping("/api/uploads")
public class FileController {

    private static final Logger log = LoggerFactory.getLogger(FileController.class);

    private final String storageLocation;
    private final FileStorageService fileStorageService;
    private final R2StorageService r2;

    public FileController(
            @Value("${storage.location}") String storageLocation,
            FileStorageService fileStorageService,
            R2StorageService r2) {
        this.storageLocation = storageLocation;
        this.fileStorageService = fileStorageService;
        this.r2 = r2;
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Map<String, String>> subirArchivo(@RequestParam("file") MultipartFile file) {
        try {
            String nombreArchivo = fileStorageService.guardarArchivo(file);
            return ResponseEntity.ok(Map.of("filename", nombreArchivo));
        } catch (Exception e) {
            log.error("Error subiendo archivo: {}", e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
        }
    }

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

            byte[] r2Bytes = r2.descargar(filename);
            String contentType = filename.toLowerCase().endsWith(".png") ? "image/png"
                    : filename.toLowerCase().endsWith(".webp") ? "image/webp"
                    : "image/jpeg";
            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(contentType))
                    .header("Cache-Control", "public, max-age=86400")
                    .body(r2Bytes);

        } catch (Exception e) {
            log.error("Error sirviendo archivo {}: {}", filename, e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
        }
    }
}
