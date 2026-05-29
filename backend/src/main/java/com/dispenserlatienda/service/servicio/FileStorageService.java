package com.dispenserlatienda.service.servicio;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.*;
import java.util.UUID;

@Service
public class FileStorageService {

    private static final Logger log = LoggerFactory.getLogger(FileStorageService.class);

    private final String storageLocation;
    private final R2StorageService r2;

    public FileStorageService(
            @Value("${storage.location}") String storageLocation,
            R2StorageService r2) {
        this.storageLocation = storageLocation;
        this.r2 = r2;
    }

    public String guardarArchivo(MultipartFile archivo) throws IOException {
        String nombreArchivo = UUID.randomUUID().toString() + "_" + archivo.getOriginalFilename();
        String contentType = archivo.getContentType() != null ? archivo.getContentType() : "image/jpeg";

        r2.subir(nombreArchivo, archivo.getBytes(), contentType);
        return nombreArchivo;
    }

    public void eliminarArchivo(String nombreArchivo) throws IOException {
        if (nombreArchivo == null || nombreArchivo.isEmpty()) return;

        r2.eliminar(nombreArchivo);

        Path filePath = Paths.get(storageLocation, nombreArchivo);
        if (Files.exists(filePath)) {
            Files.delete(filePath);
            log.info("Disco: archivo eliminado → {}", nombreArchivo);
        }
    }
}
