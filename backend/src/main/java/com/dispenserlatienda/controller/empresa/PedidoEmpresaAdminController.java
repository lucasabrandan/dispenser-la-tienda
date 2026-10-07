package com.dispenserlatienda.controller.empresa;

import com.dispenserlatienda.domain.usuario.Usuario;
import com.dispenserlatienda.dto.empresa.PedidoComentarioDTO;
import com.dispenserlatienda.dto.empresa.PedidoEmpresaDTO;
import com.dispenserlatienda.repository.usuario.UsuarioRepository;
import com.dispenserlatienda.service.empresa.PedidoEmpresaService;
import com.dispenserlatienda.service.equipo.HistorialEquipoService;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

// Bandeja de pedidos de empresas — solo ADMIN (ver SecurityConfig).
@RestController
@RequestMapping("/api/pedidos-empresa")
public class PedidoEmpresaAdminController {

    private final PedidoEmpresaService service;
    private final UsuarioRepository usuarioRepo;
    private final HistorialEquipoService historial;

    public PedidoEmpresaAdminController(PedidoEmpresaService service, UsuarioRepository usuarioRepo, HistorialEquipoService historial) {
        this.service = service;
        this.usuarioRepo = usuarioRepo;
        this.historial = historial;
    }

    @GetMapping
    public List<PedidoEmpresaDTO> listar() { return service.listarTodos(); }

    @GetMapping("/count-nuevos")
    public Map<String, Long> countNuevos() { return Map.of("count", service.nuevosSinAgendar()); }

    @GetMapping("/{id}")
    public PedidoEmpresaDTO obtener(@PathVariable Long id) { return service.obtener(id); }

    @GetMapping("/{id}/comentarios")
    public List<PedidoComentarioDTO> comentarios(@PathVariable Long id, Authentication auth) { return service.comentarios(yo(auth), id); }

    @PostMapping("/{id}/comentarios")
    public PedidoComentarioDTO comentar(@PathVariable Long id, @RequestBody Map<String, String> body, Authentication auth) {
        return service.comentar(yo(auth), id, body.get("texto"));
    }

    @GetMapping("/{id}/informe")
    public List<Map<String, Object>> informe(@PathVariable Long id) {
        PedidoEmpresaDTO p = service.obtener(id);
        return historial.informeDeOrden(p.ordenId());
    }

    @PostMapping("/{id}/agendar")
    public PedidoEmpresaDTO agendar(@PathVariable Long id, @RequestBody Map<String, String> body) {
        Long tecnicoId = body.get("tecnicoId") != null ? Long.valueOf(body.get("tecnicoId")) : null;
        LocalDate fecha = body.get("fecha") != null ? LocalDate.parse(body.get("fecha")) : null;
        return service.agendar(id, tecnicoId, fecha, body.get("hora"));
    }

    @PatchMapping("/{id}/rechazar")
    public PedidoEmpresaDTO rechazar(@PathVariable Long id, @RequestBody(required = false) Map<String, String> body) {
        return service.rechazar(id, body != null ? body.get("motivo") : null);
    }

    @GetMapping("/usuarios")
    public List<Map<String, Object>> usuarios() { return service.usuariosEmpresa(); }

    private Usuario yo(Authentication auth) {
        return usuarioRepo.findByUsername(auth.getName()).orElseThrow();
    }
}
