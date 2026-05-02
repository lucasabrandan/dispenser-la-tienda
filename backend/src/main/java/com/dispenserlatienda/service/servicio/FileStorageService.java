package com.dispenserlatienda.service.servicio;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.*;
import java.util.UUID;

@Service
public class FileStorageService {

    @Value("${storage.location}")
    private String storageLocation;

    @Autowired
    private R2StorageService r2;

    public String guardarArchivo(MultipartFile archivo) throws IOException {
        String nombreArchivo = UUID.randomUUID().toString() + "_" + archivo.getOriginalFilename();
        String contentType = archivo.getContentType() != null ? archivo.getContentType() : "image/jpeg";

        r2.subir(nombreArchivo, archivo.getBytes(), contentType);
        return nombreArchivo;
    }

    public void eliminarArchivo(String nombreArchivo) throws IOException {
        if (nombreArchivo == null || nombreArchivo.isEmpty()) return;

        // Eliminar de R2
        r2.eliminar(nombreArchivo);

        // Eliminar del disco local si todavía existe (archivos viejos)
        Path filePath = Paths.get(storageLocation, nombreArchivo);
        if (Files.exists(filePath)) {
            Files.delete(filePath);
            System.out.println("✅ Disco: archivo eliminado → " + nombreArchivo);
        }
    }
}
