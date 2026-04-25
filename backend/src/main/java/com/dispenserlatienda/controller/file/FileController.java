package com.dispenserlatienda.controller.file;

import com.dispenserlatienda.service.servicio.FileStorageService;
import org.springframework.beans.factory.annotation.Autowired;
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

    @Value("${storage.location}")
    private String storageLocation;

    @Autowired
    private FileStorageService fileStorageService;

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

    @GetMapping("/{filename:.+}")
    public ResponseEntity<byte[]> servirArchivo(@PathVariable String filename) {
        try {
            Path filePath = Paths.get(storageLocation, filename);
            File file = filePath.toFile();

            if (!file.exists()) {
                System.out.println("❌ Archivo no encontrado: " + filePath.toAbsolutePath());
                return ResponseEntity.notFound().build();
            }

            byte[] fileContent = Files.readAllBytes(filePath);
            System.out.println("✅ Sirviendo: " + filename);

            // Detectar content-type real para que el cliente pueda decodificar correctamente
            String contentType = Files.probeContentType(filePath);
            if (contentType == null) contentType = "image/jpeg";
            MediaType mediaType = MediaType.parseMediaType(contentType);

            return ResponseEntity.ok()
                    .contentType(mediaType)
                    .header("Cache-Control", "no-store, no-cache, must-revalidate")
                    .header("Vary", "Origin")
                    .body(fileContent);

        } catch (Exception e) {
            System.out.println("❌ Error sirviendo archivo: " + e.getMessage());
            return ResponseEntity.internalServerError().build();
        }
    }
}