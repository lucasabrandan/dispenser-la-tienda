package com.dispenserlatienda.controller.liquidacion;

import com.dispenserlatienda.domain.usuario.RolUsuario;
import com.dispenserlatienda.domain.usuario.Usuario;
import com.dispenserlatienda.dto.servicio.LiquidacionCompletaDTO;
import com.dispenserlatienda.repository.usuario.UsuarioRepository;
import com.dispenserlatienda.service.liquidacion.LiquidacionService;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.Map;

// Liquidación con cuentas y cierre de mes (5-oct-2026).
// GET: admin elige técnico; el técnico ve la suya. Movimientos, cerrar y reabrir:
// solo admin. Aceptar: el técnico, sobre su propio mes cerrado.
@RestController
@RequestMapping("/api/liquidacion")
public class LiquidacionController {
    private final LiquidacionService service;
    private final UsuarioRepository usuarioRepository;

    public LiquidacionController(LiquidacionService service, UsuarioRepository usuarioRepository) {
        this.service = service;
        this.usuarioRepository = usuarioRepository;
    }

    @GetMapping
    public LiquidacionCompletaDTO obtener(@RequestParam(required = false) String mes,
                                          @RequestParam(required = false) Long tecnicoId, Authentication auth) {
        Usuario yo = yo(auth);
        Long id = (yo.getRol() == RolUsuario.ADMIN && tecnicoId != null) ? tecnicoId : yo.getId();
        return service.obtener(id, mes);
    }

    @PostMapping("/movimientos")
    public LiquidacionCompletaDTO agregar(@RequestBody Map<String, Object> b, Authentication auth) {
        soloAdmin(auth);
        BigDecimal monto;
        try { monto = new BigDecimal(String.valueOf(b.get("monto"))); }
        catch (Exception e) { throw new IllegalArgumentException("Monto inválido"); }
        return service.agregarMovimiento(largo(b.get("tecnicoId")), str(b.get("mes")), str(b.get("tipo")), monto, str(b.get("nota")));
    }

    @DeleteMapping("/movimientos/{id}")
    public LiquidacionCompletaDTO borrar(@PathVariable Long id, Authentication auth) {
        soloAdmin(auth);
        return service.borrarMovimiento(id);
    }

    @PostMapping("/cerrar")
    public LiquidacionCompletaDTO cerrar(@RequestBody Map<String, Object> b, Authentication auth) {
        soloAdmin(auth);
        return service.cerrar(largo(b.get("tecnicoId")), str(b.get("mes")));
    }

    @PostMapping("/reabrir")
    public LiquidacionCompletaDTO reabrir(@RequestBody Map<String, Object> b, Authentication auth) {
        soloAdmin(auth);
        return service.reabrir(largo(b.get("tecnicoId")), str(b.get("mes")));
    }

    @PostMapping("/aceptar")
    public LiquidacionCompletaDTO aceptar(@RequestBody Map<String, Object> b, Authentication auth) {
        return service.aceptar(yo(auth).getId(), str(b.get("mes")));
    }

    private static String str(Object o) { return o == null ? null : String.valueOf(o); }
    private static Long largo(Object o) {
        if (o == null) throw new IllegalArgumentException("Falta el técnico");
        return Long.valueOf(String.valueOf(o));
    }
    private void soloAdmin(Authentication auth) {
        if (yo(auth).getRol() != RolUsuario.ADMIN) throw new AccessDeniedException("Solo el admin");
    }
    private Usuario yo(Authentication auth) {
        return usuarioRepository.findByUsername(auth.getName())
                .orElseThrow(() -> new IllegalStateException("Usuario no encontrado"));
    }
}
