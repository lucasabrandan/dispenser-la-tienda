package com.dispenserlatienda.controller.propio;

import com.dispenserlatienda.domain.propio.ClientePropio;
import com.dispenserlatienda.domain.usuario.Usuario;
import com.dispenserlatienda.exception.ResourceNotFoundException;
import com.dispenserlatienda.repository.propio.ClientePropioRepository;
import com.dispenserlatienda.repository.usuario.UsuarioRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

// "Mis clientes" (5-oct-2026): libreta privada de cada usuario. Todo se filtra
// por el usuario logueado — nadie, ni el admin, ve la libreta de otro.
@RestController
@RequestMapping("/api/mis-clientes")
public class ClientePropioController {
    private final ClientePropioRepository repo;
    private final UsuarioRepository usuarioRepository;

    public ClientePropioController(ClientePropioRepository repo, UsuarioRepository usuarioRepository) {
        this.repo = repo;
        this.usuarioRepository = usuarioRepository;
    }

    @GetMapping
    public List<ClientePropio> listar(Authentication auth) {
        return repo.findByUsuarioIdOrderByNombreAsc(yo(auth).getId());
    }

    @PostMapping
    @Transactional
    public ResponseEntity<ClientePropio> crear(@RequestBody Map<String, String> body, Authentication auth) {
        ClientePropio c = new ClientePropio();
        c.setUsuario(yo(auth));
        aplicar(c, body);
        return ResponseEntity.status(HttpStatus.CREATED).body(repo.save(c));
    }

    @PutMapping("/{id}")
    @Transactional
    public ClientePropio editar(@PathVariable Long id, @RequestBody Map<String, String> body, Authentication auth) {
        ClientePropio c = propio(id, auth);
        aplicar(c, body);
        c.setActualizadoEn(LocalDateTime.now());
        return repo.save(c);
    }

    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<Void> borrar(@PathVariable Long id, Authentication auth) {
        repo.delete(propio(id, auth));
        return ResponseEntity.noContent().build();
    }

    private void aplicar(ClientePropio c, Map<String, String> b) {
        String nombre = b.get("nombre") == null ? "" : b.get("nombre").trim();
        if (nombre.isEmpty()) throw new IllegalArgumentException("El nombre es obligatorio");
        c.setNombre(corta(nombre, 120));
        c.setTelefono(corta(b.get("telefono"), 60));
        c.setDireccion(corta(b.get("direccion"), 200));
        c.setNotas(b.get("notas") == null ? null : b.get("notas").trim());
    }

    private static String corta(String s, int max) {
        if (s == null || s.isBlank()) return null;
        s = s.trim();
        return s.length() > max ? s.substring(0, max) : s;
    }

    // Si no es suyo, responde "no existe" (no revela que hay una libreta ajena)
    private ClientePropio propio(Long id, Authentication auth) {
        return repo.findByIdAndUsuarioId(id, yo(auth).getId())
                .orElseThrow(() -> new ResourceNotFoundException("Cliente no encontrado"));
    }

    private Usuario yo(Authentication auth) {
        return usuarioRepository.findByUsername(auth.getName())
                .orElseThrow(() -> new IllegalStateException("Usuario no encontrado"));
    }
}
