package com.dispenserlatienda.repository.push;

import com.dispenserlatienda.domain.push.PushSubscription;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PushSubscriptionRepository extends JpaRepository<PushSubscription, Long> {

    Optional<PushSubscription> findByEndpoint(String endpoint);

    List<PushSubscription> findByUsuarioId(Long usuarioId);

    void deleteByEndpoint(String endpoint);
}
