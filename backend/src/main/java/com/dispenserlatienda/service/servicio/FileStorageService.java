package com.dispenserlatienda.service.servicio;

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
        System.out.println("📸 GUARDANDO FOTO...");
        System.out.println("🔹 Storage Location: " + storageLocation);
        System.out.println("🔹 Nombre original: " + archivo.getOriginalFilename());
        System.out.println("🔹 Size: " + archivo.getSize());

        // 1. Crear la carpeta si no existe
        Path root = Paths.get(storageLocation);
        System.out.println("🔹 Ruta absoluta: " + root.toAbsolutePath());

        if (!Files.exists(root)) {
            Files.createDirectories(root);
            System.out.println("✅ Carpeta creada");
        } else {
            System.out.println("✅ Carpeta existe");
        }

        // 2. Crear un nombre único para la foto
        String nombreArchivo = UUID.randomUUID().toString() + "_" + archivo.getOriginalFilename();
        System.out.println("🔹 Nombre único: " + nombreArchivo);

        // 3. Guardar el archivo físicamente
        Path filePath = root.resolve(nombreArchivo);
        System.out.println("🔹 Path final: " + filePath.toAbsolutePath());

        Files.copy(archivo.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);

        System.out.println("✅ FOTO GUARDADA: " + nombreArchivo);

        // 4. Devolver el nombre para guardarlo en la DB
        return nombreArchivo;
    }

    // MÉTODO PARA ELIMINAR FOTOS
    public void eliminarArchivo(String nombreArchivo) throws IOException {
        if (nombreArchivo == null || nombreArchivo.isEmpty()) {
            return;
        }

        Path root = Paths.get(storageLocation);
        Path filePath = root.resolve(nombreArchivo);

        if (Files.exists(filePath)) {
            Files.delete(filePath);
            System.out.println("✅ Foto eliminada: " + nombreArchivo);
        }
    }
}