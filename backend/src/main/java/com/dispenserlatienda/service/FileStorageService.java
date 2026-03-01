package com.dispenserlatienda.service;

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

    public String guardarArchivo(MultipartFile archivo) throws IOException {
        // 1. Crear la carpeta si no existe
        Path root = Paths.get(storageLocation);
        if (!Files.exists(root)) {
            Files.createDirectories(root);
        }

        // 2. Crear un nombre único para la foto (para no pisar otras)
        String nombreArchivo = UUID.randomUUID().toString() + "_" + archivo.getOriginalFilename();

        // 3. Guardar el archivo físicamente
        Files.copy(archivo.getInputStream(), root.resolve(nombreArchivo), StandardCopyOption.REPLACE_EXISTING);

        // 4. Devolver el nombre para guardarlo en la DB
        return nombreArchivo;
    }
}