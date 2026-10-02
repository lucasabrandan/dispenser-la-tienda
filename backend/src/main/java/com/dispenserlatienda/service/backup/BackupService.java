package com.dispenserlatienda.service.backup;

import com.dispenserlatienda.service.servicio.R2StorageService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import javax.crypto.Cipher;
import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.IvParameterSpec;
import javax.crypto.spec.PBEKeySpec;
import javax.crypto.spec.SecretKeySpec;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.TimeUnit;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Backup diario de la base (2-oct-2026). Antes había un backup-db.bat que nunca quedó
 * programado: el último dump era de mayo. Ahora lo hace el backend solo:
 *  - todos los días a las 13:30 (hora Argentina), y al arrancar si el último tiene más de 20 h;
 *  - pg_dump en formato custom a backup/dumps (se guardan 30 días);
 *  - copia CIFRADA a Cloudflare R2 (el bucket de las fotos es público) en
 *    backups/db-dia-DD.dump.enc — un archivo por día del mes, se pisan solos (≈30 copias).
 *  Cifrado compatible con openssl, para restaurar sin la app:
 *    openssl enc -d -aes-256-cbc -pbkdf2 -iter 100000 -in db-dia-02.dump.enc -out db.dump -pass pass:CLAVE
 *    pg_restore -U dispenser_app -d dispenser_la_tienda --clean db.dump
 *  La clave es backup.clave en application-local.properties (la genera actualizar-backend.bat).
 */
@Service
public class BackupService {

    private static final Logger log = LoggerFactory.getLogger(BackupService.class);
    private static final DateTimeFormatter NOMBRE = DateTimeFormatter.ofPattern("yyyy-MM-dd_HHmm");

    @Value("${spring.datasource.url}") private String url;
    @Value("${spring.datasource.username}") private String usuario;
    @Value("${spring.datasource.password}") private String password;
    @Value("${backup.dir:C:/Users/Lucas Brandan/IdeaProjects/proyecto-dispenser/backup/dumps}") private String dir;
    @Value("${backup.pg-dump:C:/Program Files/PostgreSQL/16/bin/pg_dump.exe}") private String pgDump;
    @Value("${backup.clave:}") private String clave;
    @Value("${backup.dias-locales:30}") private int diasLocales;

    private final R2StorageService r2;
    private final ObjectMapper objectMapper;
    private volatile boolean corriendo = false;

    public BackupService(R2StorageService r2, ObjectMapper objectMapper) {
        this.r2 = r2;
        this.objectMapper = objectMapper;
    }

    private File archivoEstado() { return new File(dir, "ultimo-backup.json"); }

    @SuppressWarnings("unchecked")
    public Map<String, Object> estado() {
        File f = archivoEstado();
        Map<String, Object> out = new LinkedHashMap<>();
        if (f.exists()) {
            try { out.putAll(objectMapper.readValue(f, Map.class)); } catch (Exception ignored) { }
        }
        out.put("corriendo", corriendo);
        out.put("nubeConfigurada", clave != null && !clave.isBlank());
        return out;
    }

    @Scheduled(cron = "0 30 13 * * *", zone = "America/Argentina/Buenos_Aires")
    public void diario() {
        ejecutar("programado");
    }

    @EventListener(ApplicationReadyEvent.class)
    public void alArrancar() {
        Object fecha = estado().get("fecha");
        boolean viejo = true;
        if (fecha != null) {
            try { viejo = Duration.between(LocalDateTime.parse(fecha.toString()), LocalDateTime.now()).toHours() >= 20; }
            catch (Exception ignored) { }
        }
        if (viejo) {
            Thread t = new Thread(() -> {
                try { Thread.sleep(30_000); } catch (InterruptedException ignored) { }
                ejecutar("al arrancar");
            }, "backup-inicial");
            t.setDaemon(true);
            t.start();
        }
    }

    public synchronized Map<String, Object> ejecutar(String motivo) {
        corriendo = true;
        Map<String, Object> est = new LinkedHashMap<>();
        est.put("fecha", LocalDateTime.now().withNano(0).toString());
        est.put("motivo", motivo);
        try {
            Matcher m = Pattern.compile("jdbc:postgresql://([^:/]+)(?::(\\d+))?/([^?]+)").matcher(url);
            if (!m.find()) throw new IllegalStateException("No se pudo leer la URL de la base: " + url);
            String host = m.group(1), port = m.group(2) != null ? m.group(2) : "5432", db = m.group(3);

            File carpeta = new File(dir);
            if (!carpeta.exists() && !carpeta.mkdirs()) throw new IllegalStateException("No se pudo crear " + dir);
            File destino = new File(carpeta, "backup_" + LocalDateTime.now().format(NOMBRE) + ".dump");

            ProcessBuilder pb = new ProcessBuilder(resolverPgDump(), "-h", host, "-p", port, "-U", usuario,
                    "-d", db, "-F", "c", "-f", destino.getAbsolutePath());
            pb.environment().put("PGPASSWORD", password);
            pb.redirectErrorStream(true);
            Process p = pb.start();
            String salida = new String(p.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
            if (!p.waitFor(10, TimeUnit.MINUTES)) { p.destroyForcibly(); throw new IllegalStateException("pg_dump tardó más de 10 minutos"); }
            if (p.exitValue() != 0 || !destino.exists() || destino.length() == 0)
                throw new IllegalStateException("pg_dump falló: " + salida.trim());

            est.put("archivo", destino.getName());
            est.put("bytes", destino.length());

            // Copia en la nube (cifrada)
            if (clave == null || clave.isBlank()) {
                est.put("nube", false);
                est.put("nubeError", "Falta backup.clave en application-local.properties (corré actualizar-backend.bat)");
            } else {
                try {
                    String key = "backups/db-dia-" + String.format("%02d", LocalDateTime.now().getDayOfMonth()) + ".dump.enc";
                    r2.subir(key, cifrarOpenssl(Files.readAllBytes(destino.toPath()), clave), "application/octet-stream");
                    est.put("nube", true);
                    est.put("nubeArchivo", key);
                } catch (Exception e) {
                    est.put("nube", false);
                    est.put("nubeError", e.getMessage());
                    log.warn("Backup: no se pudo subir a R2: {}", e.getMessage());
                }
            }

            // Limpieza local
            long limite = System.currentTimeMillis() - diasLocales * 86_400_000L;
            File[] viejos = carpeta.listFiles((d, n) -> n.startsWith("backup_") && n.endsWith(".dump"));
            if (viejos != null) for (File v : viejos) if (v.lastModified() < limite) v.delete();

            est.put("ok", true);
            log.info("Backup OK: {} ({} bytes), nube={}", destino.getName(), destino.length(), est.get("nube"));
        } catch (Exception e) {
            est.put("ok", false);
            est.put("error", e.getMessage());
            log.error("Backup FALLÓ: {}", e.getMessage());
        } finally {
            corriendo = false;
        }
        guardarEstado(est);
        return estado();
    }

    @SuppressWarnings("unchecked")
    private void guardarEstado(Map<String, Object> est) {
        try {
            // Si falló, se conserva el dato del último backup bueno para mostrarlo en el Panel
            if (!Boolean.TRUE.equals(est.get("ok"))) {
                Map<String, Object> prev = estado();
                if (Boolean.TRUE.equals(prev.get("ok"))) {
                    est.put("ultimoOkFecha", prev.get("fecha"));
                    est.put("ultimoOkArchivo", prev.get("archivo"));
                } else if (prev.get("ultimoOkFecha") != null) {
                    est.put("ultimoOkFecha", prev.get("ultimoOkFecha"));
                    est.put("ultimoOkArchivo", prev.get("ultimoOkArchivo"));
                }
            }
            new File(dir).mkdirs();
            objectMapper.writeValue(archivoEstado(), est);
        } catch (Exception e) {
            log.warn("Backup: no se pudo guardar el estado: {}", e.getMessage());
        }
    }

    /** Usa backup.pg-dump si existe; si no, busca la versión más nueva instalada de PostgreSQL. */
    private String resolverPgDump() {
        if (new File(pgDump).exists()) return pgDump;
        File base = new File("C:/Program Files/PostgreSQL");
        File[] versiones = base.listFiles(File::isDirectory);
        if (versiones != null) {
            Arrays.sort(versiones, Comparator.comparing(File::getName, (a, b) -> {
                try { return Integer.compare(Integer.parseInt(b), Integer.parseInt(a)); }
                catch (NumberFormatException e) { return b.compareTo(a); }
            }));
            for (File v : versiones) {
                File exe = new File(v, "bin/pg_dump.exe");
                if (exe.exists()) return exe.getAbsolutePath();
            }
        }
        return "pg_dump"; // último intento: que esté en el PATH
    }

    /** Formato de `openssl enc -aes-256-cbc -pbkdf2 -iter 100000 -salt` (digest sha256). */
    static byte[] cifrarOpenssl(byte[] datos, String pass) throws Exception {
        byte[] salt = new byte[8];
        new SecureRandom().nextBytes(salt);
        SecretKeyFactory f = SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256");
        byte[] keyIv = f.generateSecret(new PBEKeySpec(pass.toCharArray(), salt, 100_000, 48 * 8)).getEncoded();
        Cipher c = Cipher.getInstance("AES/CBC/PKCS5Padding");
        c.init(Cipher.ENCRYPT_MODE, new SecretKeySpec(Arrays.copyOfRange(keyIv, 0, 32), "AES"),
                new IvParameterSpec(Arrays.copyOfRange(keyIv, 32, 48)));
        byte[] cifrado = c.doFinal(datos);
        ByteArrayOutputStream out = new ByteArrayOutputStream(cifrado.length + 16);
        out.write("Salted__".getBytes(StandardCharsets.US_ASCII));
        out.write(salt);
        out.write(cifrado);
        return out.toByteArray();
    }
}
