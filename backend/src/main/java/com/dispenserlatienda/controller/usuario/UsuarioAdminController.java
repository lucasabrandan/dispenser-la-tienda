package com.dispenserlatienda.controller.usuario;

import com.dispenserlatienda.domain.usuario.RolUsuario;
import com.dispenserlatienda.domain.usuario.Usuario;
import com.dispenserlatienda.dto.usuario.*;
import com.dispenserlatienda.exception.ResourceNotFoundException;
import com.dispenserlatienda.repository.usuario.UsuarioRepository;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/usuarios")
public class UsuarioAdminController {

    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;

    public UsuarioAdminController(UsuarioRepository usuarioRepository, PasswordEncoder passwordEncoder) {
        this.usuarioRepository = usuarioRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @GetMapping
    public List<UsuarioDTO> listar() {
        return usuarioRepository.findAll().stream()
                .map(u -> new UsuarioDTO(u.getId(), u.getNombre(), u.getUsername(), u.getRol().name(), u.isActivo(), u.getTelefono(), u.getWhatsapp()))
                .toList();
    }

    @PostMapping
    public ResponseEntity<UsuarioDTO> crear(@Valid @RequestBody UsuarioCreateDTO dto) {
        if (usuarioRepository.findByUsername(dto.username()).isPresent()) {
            return ResponseEntity.status(HttpStatus.CONFLICT).build();
        }
        Usuario nuevo = new Usuario(
                dto.nombre(),
                dto.username(),
                passwordEncoder.encode(dto.password()),
                RolUsuario.valueOf(dto.rol())
        );
        nuevo.setTelefono(dto.telefono());
        nuevo.setWhatsapp(dto.whatsapp());
        usuarioRepository.save(nuevo);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new UsuarioDTO(nuevo.getId(), nuevo.getNombre(), nuevo.getUsername(), nuevo.getRol().name(), nuevo.isActivo(), nuevo.getTelefono(), nuevo.getWhatsapp()));
    }

    @PutMapping("/{id}")
    public UsuarioDTO actualizar(@PathVariable Long id, @Valid @RequestBody UsuarioUpdateDTO dto) {
        Usuario u = usuarioRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado"));
        u.setNombre(dto.nombre());
        u.setRol(RolUsuario.valueOf(dto.rol()));
        u.setActivo(dto.activo());
        u.setTelefono(dto.telefono());
        u.setWhatsapp(dto.whatsapp());
        usuarioRepository.save(u);
        return new UsuarioDTO(u.getId(), u.getNombre(), u.getUsername(), u.getRol().name(), u.isActivo(), u.getTelefono(), u.getWhatsapp());
    }

    @PutMapping("/{id}/password")
    public ResponseEntity<Void> cambiarPassword(@PathVariable Long id, @Valid @RequestBody CambiarPasswordDTO dto) {
        Usuario u = usuarioRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado"));
        u.setPasswordHash(passwordEncoder.encode(dto.nuevaPassword()));
        usuarioRepository.save(u);
        return ResponseEntity.noContent().build();
    }
}
