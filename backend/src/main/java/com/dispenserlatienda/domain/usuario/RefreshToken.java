package com.dispenserlatienda.domain.usuario;

import jakarta.persistence.*;
import java.time.LocalDateTime;

// Refresh token de sesión — ver RefreshTokenService para el porqué. A
// diferencia del access token (JWT autocontenido, nunca toca la base), este
// SÍ vive en una tabla: es lo único que hace falta borrar/revocar para
// cortarle el acceso real a alguien, sin esperar a que su access token viejo
// expire solo (hasta 24hs con la config actual).
@Entity
@Table(name = "refresh_token", indexes = {
        @Index(name = "idx_refresh_token_token", columnList = "token", unique = true),
        @Index(name = "idx_refresh_token_usuario", columnList = "usuario_id")
})
public class RefreshToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;

    @Column(nullable = false, unique = true, length = 100)
    private String token;

    @Column(name = "creado_en", nullable = false)
    private LocalDateTime creadoEn;

    @Column(name = "expira_en", nullable = false)
    private LocalDateTime expiraEn;

    @Column(nullable = false)
    private boolean revocado = false;

    protected RefreshToken() {}

    public RefreshToken(Usuario usuario, String token, LocalDateTime creadoEn, LocalDateTime expiraEn) {
        this.usuario = usuario;
        this.token = token;
        this.creadoEn = creadoEn;
        this.expiraEn = expiraEn;
    }

    public Long getId() { return id; }
    public Usuario getUsuario() { return usuario; }
    public String getToken() { return token; }
    public LocalDateTime getCreadoEn() { return creadoEn; }
    public LocalDateTime getExpiraEn() { return expiraEn; }
    public void setExpiraEn(LocalDateTime expiraEn) { this.expiraEn = expiraEn; }
    public boolean isRevocado() { return revocado; }
    public void setRevocado(boolean revocado) { this.revocado = revocado; }

    public boolean esValido() {
        return !revocado && expiraEn.isAfter(LocalDateTime.now());
    }
}
