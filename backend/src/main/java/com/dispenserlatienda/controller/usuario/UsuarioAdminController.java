package com.dispenserlatienda.controller.usuario;

import com.dispenserlatienda.domain.usuario.RolUsuario;
import com.dispenserlatienda.domain.usuario.Usuario;
import com.dispenserlatienda.dto.usuario.*;
import com.dispenserlatienda.exception.ResourceNotFoundException;
import com.dispenserlatienda.repository.servicio.ServicioRepository;
import com.dispenserlatienda.repository.usuario.UsuarioRepository;
import com.dispenserlatienda.service.usuario.RefreshTokenService;
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
    private final ServicioRepository servicioRepository;
    private final RefreshTokenService refreshTokenService;

    public UsuarioAdminController(UsuarioRepository usuarioRepository, PasswordEncoder passwordEncoder,
                                   ServicioRepository servicioRepository, RefreshTokenService refreshTokenService) {
        this.usuarioRepository = usuarioRepository;
        this.passwordEncoder = passwordEncoder;
        this.servicioRepository = servicioRepository;
        this.refreshTokenService = refreshTokenService;
    }

    @GetMapping
    public List<UsuarioDTO> listar() {
        return usuarioRepository.findAll().stream()
                .map(u -> new UsuarioDTO(u.getId(), u.getNombre(), u.getUsername(), u.getRol().name(), u.isActivo(), u.getTelefono(), u.getWhatsapp(), u.getFirma(), u.getSueldoObjetivo()))
                .toList();
    }

    @PostMapping
    public ResponseEntity<UsuarioDTO> crear(@Valid @RequestBody UsuarioCreateDTO dto) {
        // Mismo motivo que en AuthController.login(): un usuario creado con
        // un espacio de más (accidental) nunca iba a poder loguearse con el
        // texto "visible" del username, sin ningún indicio de por qué.
        String username = dto.username() == null ? null : dto.username().trim();
        if (usuarioRepository.findByUsername(username).isPresent()) {
            return ResponseEntity.status(HttpStatus.CONFLICT).build();
        }
        Usuario nuevo = new Usuario(
                dto.nombre(),
                username,
                passwordEncoder.encode(dto.password()),
                RolUsuario.valueOf(dto.rol())
        );
        nuevo.setTelefono(dto.telefono());
        nuevo.setWhatsapp(dto.whatsapp());
        usuarioRepository.save(nuevo);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new UsuarioDTO(nuevo.getId(), nuevo.getNombre(), nuevo.getUsername(), nuevo.getRol().name(), nuevo.isActivo(), nuevo.getTelefono(), nuevo.getWhatsapp(), nuevo.getFirma(), nuevo.getSueldoObjetivo()));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Object> actualizar(@PathVariable Long id, @Valid @RequestBody UsuarioUpdateDTO dto) {
        Usuario u = usuarioRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado"));
        boolean seDesactiva = u.isActivo() && !dto.activo();
        RolUsuario nuevoRol = RolUsuario.valueOf(dto.rol());
        // Si este usuario es admin activo y el cambio lo deja sin serlo
        // (se desactiva o se le cambia el rol), verificar que no sea el
        // único admin activo — si no, la empresa se queda sin nadie que
        // pueda administrar el sistema.
        boolean dejaDeSerAdminActivo = u.getRol() == RolUsuario.ADMIN && u.isActivo()
                && (nuevoRol != RolUsuario.ADMIN || !dto.activo());
        if (dejaDeSerAdminActivo && usuarioRepository.countByRolAndActivoTrue(RolUsuario.ADMIN) <= 1) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(java.util.Map.of("mensaje", "No podés dejar el sistema sin ningún administrador activo."));
        }
        u.setNombre(dto.nombre());
        u.setRol(nuevoRol);
        u.setActivo(dto.activo());
        u.setTelefono(dto.telefono());
        u.setWhatsapp(dto.whatsapp());
        usuarioRepository.save(u);
        // Al desactivar, cortar el acceso de verdad: sin el refresh token no
        // puede renovar el access token vencido — en minutos u horas queda
        // afuera, en vez de tener que esperar hasta 24hs a que expire solo.
        if (seDesactiva) {
            refreshTokenService.revocarTodosDeUsuario(u.getId());
        }
        return ResponseEntity.ok(new UsuarioDTO(u.getId(), u.getNombre(), u.getUsername(), u.getRol().name(), u.isActivo(), u.getTelefono(), u.getWhatsapp(), u.getFirma(), u.getSueldoObjetivo()));
    }

    @PutMapping("/{id}/firma")
    public ResponseEntity<Void> guardarFirma(@PathVariable Long id, @RequestBody java.util.Map<String, String> body) {
        Usuario u = usuarioRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado"));
        u.setFirma(body.get("firma"));
        usuarioRepository.save(u);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id}/password")
    public ResponseEntity<Void> cambiarPassword(@PathVariable Long id, @Valid @RequestBody CambiarPasswordDTO dto) {
        Usuario u = usuarioRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado"));
        u.setPasswordHash(passwordEncoder.encode(dto.nuevaPassword()));
        usuarioRepository.save(u);
        // Cambiar la contraseña deberia cerrar las sesiones viejas — sin esto,
        // alguien con el token/refresh token de antes seguia entrando igual.
        refreshTokenService.revocarTodosDeUsuario(u.getId());
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/sueldo-objetivo")
    public ResponseEntity<Void> actualizarSueldoObjetivo(@PathVariable Long id, @RequestBody java.util.Map<String, Object> body) {
        Usuario u = usuarioRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado"));
        Object val = body.get("sueldoObjetivo");
        u.setSueldoObjetivo(val != null ? new java.math.BigDecimal(val.toString()) : null);
        usuarioRepository.save(u);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Object> eliminar(@PathVariable Long id) {
        Usuario u = usuarioRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado"));
        if (servicioRepository.existsByUsuarioId(id)) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(java.util.Map.of("mensaje", "El usuario tiene servicios registrados. Desactivalo en lugar de eliminarlo."));
        }
        // No dejar la empresa sin ningún admin activo.
        if (u.getRol() == RolUsuario.ADMIN && u.isActivo()
                && usuarioRepository.countByRolAndActivoTrue(RolUsuario.ADMIN) <= 1) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(java.util.Map.of("mensaje", "No podés eliminar al único administrador activo."));
        }
        usuarioRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
