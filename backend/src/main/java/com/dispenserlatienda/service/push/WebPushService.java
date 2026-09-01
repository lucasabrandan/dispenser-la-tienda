package com.dispenserlatienda.service.push;

import com.dispenserlatienda.domain.push.PushSubscription;
import com.dispenserlatienda.domain.usuario.Usuario;
import com.dispenserlatienda.repository.push.PushSubscriptionRepository;
import io.jsonwebtoken.Jwts;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.math.BigInteger;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.security.AlgorithmParameters;
import java.security.KeyFactory;
import java.security.interfaces.ECPrivateKey;
import java.security.spec.ECGenParameterSpec;
import java.security.spec.ECParameterSpec;
import java.security.spec.ECPrivateKeySpec;
import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.Date;
import java.util.List;
import java.util.concurrent.CompletableFuture;

/**
 * WebPushService — manda notificaciones push (Web Push / VAPID) a los
 * navegadores/celulares suscriptos de un usuario.
 *
 * No manda contenido cifrado en el push (RFC 8291 completo no está
 * implementado a propósito): cada push va vacío, solo firmado con VAPID, y
 * el service worker del frontend muestra una notificación genérica al
 * recibirlo. El usuario ve el detalle real al abrir la app (la campanita ya
 * lo tiene resuelto). Esto evita implementar cifrado AES128GCM/HKDF a mano.
 *
 * Fire-and-forget: igual que WhatsAppService, nunca bloquea ni propaga
 * excepciones al caller.
 *
 * Setup: las claves VAPID (par de claves EC P-256) se generan una sola vez
 * y se cargan por config — ver push.vapid.* en application-local.properties.
 */
@Service
public class WebPushService {

    private static final Logger log = LoggerFactory.getLogger(WebPushService.class);

    @Value("${push.vapid.public-key:}")
    private String vapidPublicKeyB64;

    @Value("${push.vapid.private-key:}")
    private String vapidPrivateKeyB64;

    @Value("${push.vapid.subject:}")
    private String vapidSubject;

    private final PushSubscriptionRepository repo;

    private ECPrivateKey vapidPrivateKey;

    private final HttpClient http = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    public WebPushService(PushSubscriptionRepository repo) {
        this.repo = repo;
    }

    @PostConstruct
    void init() {
        if (!isConfigurado()) {
            log.info("Web Push (VAPID) no configurado — notificaciones push deshabilitadas");
            return;
        }
        try {
            this.vapidPrivateKey = loadPrivateKey(decode(vapidPrivateKeyB64));
        } catch (Exception e) {
            log.error("VAPID: no se pudieron cargar las claves — push deshabilitado. {}", e.getMessage());
            this.vapidPrivateKey = null;
        }
    }

    public boolean isConfigurado() {
        return notBlank(vapidPublicKeyB64) && notBlank(vapidPrivateKeyB64) && notBlank(vapidSubject);
    }

    /**
     * Manda un push a todos los dispositivos suscriptos de ese usuario.
     */
    public void enviarATodosLosDispositivos(Usuario destino) {
        if (vapidPrivateKey == null || destino == null || destino.getId() == null) return;
        List<PushSubscription> subs = repo.findByUsuarioId(destino.getId());
        for (PushSubscription sub : subs) {
            enviarA(sub);
        }
    }

    private void enviarA(PushSubscription sub) {
        CompletableFuture.runAsync(() -> {
            try {
                URI endpoint = URI.create(sub.getEndpoint());
                String aud = endpoint.getScheme() + "://" + endpoint.getHost();
                String jwt = firmarVapid(aud);

                HttpRequest req = HttpRequest.newBuilder()
                        .uri(endpoint)
                        .header("Authorization", "vapid t=" + jwt + ", k=" + vapidPublicKeyB64)
                        .header("TTL", "2419200")
                        .header("Content-Length", "0")
                        .POST(HttpRequest.BodyPublishers.noBody())
                        .timeout(Duration.ofSeconds(15))
                        .build();

                HttpResponse<String> res = http.send(req, HttpResponse.BodyHandlers.ofString());

                if (res.statusCode() == 201 || res.statusCode() == 200 || res.statusCode() == 204) {
                    log.debug("Push enviado a suscripción #{}", sub.getId());
                } else if (res.statusCode() == 404 || res.statusCode() == 410) {
                    // Suscripción vencida/inválida (navegador desinstalado, permiso
                    // revocado, etc.) — se borra para no reintentar en vano.
                    log.info("Push: suscripción #{} vencida ({}), eliminando", sub.getId(), res.statusCode());
                    repo.deleteById(sub.getId());
                } else {
                    log.warn("Push: respuesta inesperada {} para suscripción #{}: {}", res.statusCode(), sub.getId(), res.body());
                }
            } catch (Exception e) {
                log.error("Push: error enviando a suscripción #{}: {}", sub.getId(), e.getMessage());
            }
        });
    }

    private String firmarVapid(String audience) {
        Instant ahora = Instant.now();
        return Jwts.builder()
                .claim("aud", audience)
                .subject(vapidSubject)
                .issuedAt(Date.from(ahora))
                .expiration(Date.from(ahora.plus(12, ChronoUnit.HOURS)))
                .signWith(vapidPrivateKey, Jwts.SIG.ES256)
                .compact();
    }

    // ── Carga de la clave privada EC P-256 cruda (formato Web Push) ──────────

    private ECPrivateKey loadPrivateKey(byte[] rawScalar) throws Exception {
        AlgorithmParameters params = AlgorithmParameters.getInstance("EC");
        params.init(new ECGenParameterSpec("secp256r1"));
        ECParameterSpec ecSpec = params.getParameterSpec(ECParameterSpec.class);

        BigInteger s = new BigInteger(1, rawScalar);
        ECPrivateKeySpec spec = new ECPrivateKeySpec(s, ecSpec);
        KeyFactory kf = KeyFactory.getInstance("EC");
        return (ECPrivateKey) kf.generatePrivate(spec);
    }

    private byte[] decode(String base64Url) {
        return Base64.getUrlDecoder().decode(pad(base64Url));
    }

    // Las claves vienen en base64url SIN padding (formato estándar de Web
    // Push) — Base64.getUrlDecoder() de Java lo requiere, así que se repone acá.
    private String pad(String s) {
        int rem = s.length() % 4;
        if (rem == 0) return s;
        return s + "====".substring(rem);
    }

    private boolean notBlank(String s) { return s != null && !s.isBlank(); }
}
