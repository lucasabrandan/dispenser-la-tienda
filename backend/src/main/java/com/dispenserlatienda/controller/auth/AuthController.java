package com.dispenserlatienda.controller.auth;

import com.dispenserlatienda.domain.usuario.Usuario;
import com.dispenserlatienda.dto.auth.LoginRequestDTO;
import com.dispenserlatienda.dto.auth.LoginResponseDTO;
import com.dispenserlatienda.repository.usuario.UsuarioRepository;
import com.dispenserlatienda.security.JwtUtil;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final JwtUtil jwtUtil;
    private final UsuarioRepository usuarioRepository;

    public AuthController(AuthenticationManager authenticationManager, JwtUtil jwtUtil,
                          UsuarioRepository usuarioRepository) {
        this.authenticationManager = authenticationManager;
        this.jwtUtil = jwtUtil;
        this.usuarioRepository = usuarioRepository;
    }

    @PostMapping("/login")
    public ResponseEntity<LoginResponseDTO> login(@Valid @RequestBody LoginRequestDTO request) {
        authenticationManager.authenticate(
            new UsernamePasswordAuthenticationToken(request.username(), request.password())
        );

        Usuario usuario = usuarioRepository.findByUsername(request.username()).orElseThrow();
        String token = jwtUtil.generarToken(usuario.getUsername(), usuario.getRol().name(), usuario.getNombre());

        return ResponseEntity.ok(new LoginResponseDTO(
            token,
            usuario.getUsername(),
            usuario.getNombre(),
            usuario.getRol().name()
        ));
    }
}
