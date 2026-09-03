package com.dispenserlatienda.repository.usuario;

import com.dispenserlatienda.domain.usuario.RefreshToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, Long> {

    Optional<RefreshToken> findByToken(String token);

    // Se usa al desactivar un usuario o resetearle la contraseña — corta el
    // acceso real, sin esperar a que su access token viejo expire solo.
    @Modifying
    @Query("update RefreshToken r set r.revocado = true where r.usuario.id = :usuarioId and r.revocado = false")
    void revocarTodosDeUsuario(@Param("usuarioId") Long usuarioId);
}
