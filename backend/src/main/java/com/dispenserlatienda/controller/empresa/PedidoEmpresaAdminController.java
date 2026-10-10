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
        // aCoordinar (10-oct-2026): la visita queda con los días/franjas que marcó la empresa
        // y el técnico confirma el día (fecha opcional: si falta, el primer día que les sirve)
        return service.agendar(id, tecnicoId, fecha, body.get("hora"), Boolean.parseBoolean(body.get("aCoordinar")));
    }

    @PatchMapping("/{id}/rechazar")
    public PedidoEmpresaDTO rechazar(@PathVariable Long id, @RequestBody(required = false) Map<String, String> body) {
        return service.rechazar(id, body != null ? body.get("motivo") : null);
    }

    @org.springframework.beans.factory.annotation.Autowired
    private com.dispenserlatienda.service.empresa.PortalEmpresaService portal;

    // Aprobación del resumen del mes de un cliente (lo muestra el cierre mensual, 8-oct-2026)
    @GetMapping("/aprobacion")
    public Map<String, Object> aprobacion(@RequestParam Long clienteId, @RequestParam String mes) {
        Map<String, Object> a = portal.aprobacion(clienteId, mes);
        return a == null ? Map.of() : a;
    }

    // Cerrar una observación de la empresa: RESUELTA o NO_CORRESPONDE (9-oct-2026)
    @PatchMapping("/{id}/observacion")
    public PedidoEmpresaDTO cerrarObservacion(@PathVariable Long id, @RequestBody Map<String, String> body, Authentication auth) {
        return service.cerrarObservacion(yo(auth), id, body.get("estado"), body.get("nota"));
    }

    @org.springframework.beans.factory.annotation.Autowired
    private com.dispenserlatienda.service.empresa.PortalConfigService portalConfig;

    // Funciones del portal de un cliente (9-oct-2026)
    @GetMapping("/portal/{clienteId}")
    public Map<String, Object> portalDe(@PathVariable Long clienteId) {
        return com.dispenserlatienda.service.empresa.PortalConfigService.aMapa(portalConfig.de(clienteId));
    }

    @PutMapping("/portal/{clienteId}")
    public Map<String, Object> guardarPortal(@PathVariable Long clienteId, @RequestBody Map<String, Object> body) {
        return com.dispenserlatienda.service.empresa.PortalConfigService.aMapa(portalConfig.guardar(clienteId, body));
    }

    @GetMapping("/usuarios")
    public List<Map<String, Object>> usuarios() { return service.usuariosEmpresa(); }

    private Usuario yo(Authentication auth) {
        return usuarioRepo.findByUsername(auth.getName()).orElseThrow();
    }
}
