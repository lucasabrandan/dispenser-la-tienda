package com.dispenserlatienda.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

@RestController
@RequestMapping("/uploads")
@CrossOrigin(origins = "http://localhost:3000")
public class FileController {

    @Value("${storage.location}")
    private String storageLocation;

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

            return ResponseEntity.ok()
                    .contentType(MediaType.IMAGE_JPEG)
                    .body(fileContent);

        } catch (Exception e) {
            System.out.println("❌ Error sirviendo archivo: " + e.getMessage());
            return ResponseEntity.internalServerError().build();
        }
    }
}