package com.dispenserlatienda.controller.empresa;

import com.dispenserlatienda.domain.usuario.Usuario;
import com.dispenserlatienda.dto.empresa.PedidoComentarioDTO;
import com.dispenserlatienda.dto.empresa.PedidoEmpresaCreateDTO;
import com.dispenserlatienda.dto.empresa.PedidoEmpresaDTO;
import com.dispenserlatienda.repository.usuario.UsuarioRepository;
import com.dispenserlatienda.service.empresa.PedidoEmpresaService;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

// Portal Empresa — lo único que puede usar un usuario EMPRESA (además de
// notificaciones y push). Todo filtrado por su cliente en el service.
@RestController
@RequestMapping("/api/empresa")
public class EmpresaController {

    private final PedidoEmpresaService service;
    private final UsuarioRepository usuarioRepo;

    public EmpresaController(PedidoEmpresaService service, UsuarioRepository usuarioRepo) {
        this.service = service;
        this.usuarioRepo = usuarioRepo;
    }

    @GetMapping("/datos")
    public Map<String, Object> datos(Authentication auth) {
        Usuario u = yo(auth);
        List<Map<String, Object>> datos = service.usuariosEmpresa().stream().filter(m -> u.getId().equals(m.get("id"))).toList();
        return Map.of("nombre", u.getNombre(), "empresa", datos.isEmpty() || datos.get(0).get("clienteNombre") == null ? "" : datos.get(0).get("clienteNombre"));
    }

    @GetMapping("/pedidos")
    public List<PedidoEmpresaDTO> pedidos(Authentication auth) { return service.listarDeEmpresa(yo(auth)); }

    @GetMapping("/pedidos/{id}")
    public PedidoEmpresaDTO pedido(@PathVariable Long id, Authentication auth) { return service.obtenerDeEmpresa(yo(auth), id); }

    @GetMapping("/pedidos/por-orden/{ordenId}")
    public PedidoEmpresaDTO porOrden(@PathVariable Long ordenId, Authentication auth) { return service.obtenerPorOrdenDeEmpresa(yo(auth), ordenId); }

    @PostMapping("/pedidos")
    public PedidoEmpresaDTO crear(@RequestBody PedidoEmpresaCreateDTO dto, Authentication auth) { return service.crear(yo(auth), dto); }

    @PatchMapping("/pedidos/{id}/cancelar")
    public PedidoEmpresaDTO cancelar(@PathVariable Long id, Authentication auth) { return service.cancelarPorEmpresa(yo(auth), id); }

    @GetMapping("/pedidos/{id}/comentarios")
    public List<PedidoComentarioDTO> comentarios(@PathVariable Long id, Authentication auth) { return service.comentarios(yo(auth), id); }

    @PostMapping("/pedidos/{id}/comentarios")
    public PedidoComentarioDTO comentar(@PathVariable Long id, @RequestBody Map<String, String> body, Authentication auth) {
        return service.comentar(yo(auth), id, body.get("texto"));
    }

    @GetMapping("/sedes")
    public List<Map<String, Object>> sedes(Authentication auth) { return service.sedesDeEmpresa(yo(auth)); }

    private Usuario yo(Authentication auth) {
        return usuarioRepo.findByUsername(auth.getName()).orElseThrow();
    }
}
