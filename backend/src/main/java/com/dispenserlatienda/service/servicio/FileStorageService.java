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

    // Testeo integral M1 (7-oct-2026): antes se aceptaba cualquier archivo (por ejemplo un
    // .html, que quedaba publicado en el almacenamiento público). Ahora solo imágenes y PDF,
    // reconocidos por su contenido real (no por el nombre ni lo que dice el navegador).
    public String guardarArchivo(MultipartFile archivo) throws IOException {
        byte[] bytes = archivo.getBytes();
        String[] tipo = tipoReal(bytes);
        if (tipo == null)
            throw new com.dispenserlatienda.exception.BusinessException("ARCHIVO_INVALIDO", "Solo se pueden subir fotos (JPG, PNG, WEBP, HEIC) o PDF");
        String base = archivo.getOriginalFilename() == null ? "archivo" : archivo.getOriginalFilename();
        base = base.replaceAll("\\.[A-Za-z0-9]{1,5}$", "").replaceAll("[^A-Za-z0-9_-]", "_");
        if (base.length() > 60) base = base.substring(0, 60);
        if (base.isBlank()) base = "archivo";
        String nombreArchivo = UUID.randomUUID() + "_" + base + "." + tipo[1];
        r2.subir(nombreArchivo, bytes, tipo[0]);
        return nombreArchivo;
    }

    /** {contentType, extensión} según los primeros bytes, o null si no es un tipo permitido. */
    static String[] tipoReal(byte[] b) {
        if (b == null || b.length < 12) return null;
        if ((b[0] & 0xFF) == 0xFF && (b[1] & 0xFF) == 0xD8 && (b[2] & 0xFF) == 0xFF) return new String[]{"image/jpeg", "jpg"};
        if ((b[0] & 0xFF) == 0x89 && b[1] == 'P' && b[2] == 'N' && b[3] == 'G') return new String[]{"image/png", "png"};
        if (b[0] == 'R' && b[1] == 'I' && b[2] == 'F' && b[3] == 'F' && b[8] == 'W' && b[9] == 'E' && b[10] == 'B' && b[11] == 'P') return new String[]{"image/webp", "webp"};
        if (b[0] == 'G' && b[1] == 'I' && b[2] == 'F' && b[3] == '8') return new String[]{"image/gif", "gif"};
        if (b[4] == 'f' && b[5] == 't' && b[6] == 'y' && b[7] == 'p') {
            String marca = new String(b, 8, 4, java.nio.charset.StandardCharsets.US_ASCII);
            if (marca.startsWith("hei") || marca.startsWith("hev") || marca.startsWith("mif") || marca.startsWith("msf"))
                return new String[]{"image/heic", "heic"};
        }
        if (b[0] == '%' && b[1] == 'P' && b[2] == 'D' && b[3] == 'F') return new String[]{"application/pdf", "pdf"};
        return null;
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
