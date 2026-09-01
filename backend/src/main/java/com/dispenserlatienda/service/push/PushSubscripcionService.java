package com.dispenserlatienda.service.push;

import com.dispenserlatienda.domain.push.PushSubscription;
import com.dispenserlatienda.domain.usuario.Usuario;
import com.dispenserlatienda.repository.push.PushSubscriptionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PushSubscripcionService {

    private final PushSubscriptionRepository repo;

    public PushSubscripcionService(PushSubscriptionRepository repo) {
        this.repo = repo;
    }

    // Upsert por endpoint: si el navegador ya tenía una suscripción registrada
    // (por ejemplo, se relogueó con otro usuario en el mismo dispositivo), se
    // actualiza en vez de duplicar.
    @Transactional
    public void suscribir(Usuario usuario, String endpoint, String p256dh, String auth) {
        PushSubscription sub = repo.findByEndpoint(endpoint).orElseGet(PushSubscription::new);
        sub.setEndpoint(endpoint);
        sub.setP256dh(p256dh);
        sub.setAuth(auth);
        sub.setUsuario(usuario);
        repo.save(sub);
    }

    @Transactional
    public void desuscribir(String endpoint) {
        repo.deleteByEndpoint(endpoint);
    }
}
