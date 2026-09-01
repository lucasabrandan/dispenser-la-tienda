package com.dispenserlatienda.domain.push;

import com.dispenserlatienda.domain.usuario.Usuario;
import jakarta.persistence.*;
import java.time.LocalDateTime;

/**
 * Una suscripción push de un navegador/dispositivo concreto (lo que devuelve
 * PushManager.subscribe() en el frontend). Un mismo usuario puede tener varias
 * (celu + PC, o varios navegadores) — cada una recibe la notificación por separado.
 */
@Entity
@Table(name = "push_subscription", uniqueConstraints = {
    @UniqueConstraint(name = "uk_push_endpoint", columnNames = "endpoint")
})
public class PushSubscription {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;

    // Las URL de FCM pueden ser largas — TEXT en vez de VARCHAR con límite.
    @Column(nullable = false, columnDefinition = "TEXT")
    private String endpoint;

    @Column(nullable = false, length = 255)
    private String p256dh;

    @Column(nullable = false, length = 255)
    private String auth;

    @Column(name = "creado_en", nullable = false, updatable = false)
    private LocalDateTime creadoEn;

    @PrePersist
    protected void onCreate() { this.creadoEn = LocalDateTime.now(); }

    public PushSubscription() {}

    // Getters / Setters
    public Long getId() { return id; }
    public Usuario getUsuario() { return usuario; }
    public void setUsuario(Usuario usuario) { this.usuario = usuario; }
    public String getEndpoint() { return endpoint; }
    public void setEndpoint(String endpoint) { this.endpoint = endpoint; }
    public String getP256dh() { return p256dh; }
    public void setP256dh(String p256dh) { this.p256dh = p256dh; }
    public String getAuth() { return auth; }
    public void setAuth(String auth) { this.auth = auth; }
    public LocalDateTime getCreadoEn() { return creadoEn; }
}
