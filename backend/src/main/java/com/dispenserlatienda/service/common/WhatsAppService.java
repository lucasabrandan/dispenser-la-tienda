package com.dispenserlatienda.service.common;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.concurrent.CompletableFuture;

/**
 * WhatsAppService — envía mensajes vía UltraMsg.
 * Fire-and-forget: nunca bloquea ni propaga excepciones al caller.
 *
 * Setup:
 *  1. Crear cuenta en https://ultramsg.com
 *  2. Crear instancia y escanear QR con el celular del negocio
 *  3. Copiar Instance ID y Token a application-local.properties
 */
@Service
public class WhatsAppService {

    private static final Logger log = LoggerFactory.getLogger(WhatsAppService.class);

    @Value("${whatsapp.ultramsg.instance-id:}")
    private String instanceId;

    @Value("${whatsapp.ultramsg.token:}")
    private String token;

    private final HttpClient http = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    public boolean isConfigurado() {
        return instanceId != null && !instanceId.isBlank()
            && token     != null && !token.isBlank();
    }

    /**
     * Envía un mensaje WhatsApp de forma asíncrona.
     * Si el servicio no está configurado o el número está vacío, no hace nada.
     */
    public void enviar(String numeroDestino, String mensaje) {
        if (!isConfigurado()) {
            log.debug("WhatsApp no configurado — mensaje omitido");
            return;
        }
        if (numeroDestino == null || numeroDestino.isBlank()) {
            log.debug("WhatsApp: número destino vacío — mensaje omitido");
            return;
        }

        String numero = normalizarNumero(numeroDestino);

        CompletableFuture.runAsync(() -> {
            try {
                String body = "token="    + enc(token)
                            + "&to="     + enc(numero)
                            + "&body="   + enc(mensaje);

                HttpRequest req = HttpRequest.newBuilder()
                        .uri(URI.create("https://api.ultramsg.com/" + instanceId + "/messages/chat"))
                        .header("Content-Type", "application/x-www-form-urlencoded")
                        .POST(HttpRequest.BodyPublishers.ofString(body))
                        .timeout(Duration.ofSeconds(15))
                        .build();

                HttpResponse<String> res = http.send(req, HttpResponse.BodyHandlers.ofString());

                if (res.statusCode() == 200) {
                    log.info("WhatsApp enviado a {}", numero);
                } else {
                    log.warn("WhatsApp respuesta inesperada {}: {}", res.statusCode(), res.body());
                }
            } catch (Exception e) {
                log.error("WhatsApp error enviando a {}: {}", numero, e.getMessage());
            }
        });
    }

    // Normaliza a formato internacional: 549XXXXXXXXXX (Argentina con 9 móvil)
    private String normalizarNumero(String raw) {
        String clean = raw.replaceAll("[^0-9]", "");

        // Quitar 0 inicial (0011... o 011...)
        if (clean.startsWith("00")) clean = clean.substring(2);
        if (clean.startsWith("0"))  clean = clean.substring(1);

        // Agregar código de país Argentina si no lo tiene
        if (!clean.startsWith("54")) clean = "54" + clean;

        // Insertar 9 para celular argentino si no está (549...)
        if (clean.startsWith("54") && !clean.startsWith("549") && clean.length() == 12) {
            clean = "549" + clean.substring(2);
        }

        return clean;
    }

    private String enc(String s) {
        return URLEncoder.encode(s, StandardCharsets.UTF_8);
    }
}
