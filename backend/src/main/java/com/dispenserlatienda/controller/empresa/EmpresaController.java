package com.dispenserlatienda.controller.empresa;

import com.dispenserlatienda.domain.usuario.Usuario;
import com.dispenserlatienda.dto.empresa.PedidoComentarioDTO;
import com.dispenserlatienda.dto.empresa.PedidoEmpresaCreateDTO;
import com.dispenserlatienda.dto.empresa.PedidoEmpresaDTO;
import com.dispenserlatienda.repository.usuario.UsuarioRepository;
import com.dispenserlatienda.service.empresa.PedidoEmpresaService;
import com.dispenserlatienda.service.equipo.HistorialEquipoService;
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
    private final HistorialEquipoService historial;
    private final com.dispenserlatienda.service.mapa.GeocodificadorService geo;
    private final com.dispenserlatienda.service.empresa.PortalEmpresaService portal;
    private final com.dispenserlatienda.service.servicio.FileStorageService archivos;
    @org.springframework.beans.factory.annotation.Autowired
    private com.dispenserlatienda.service.empresa.PortalConfigService config;

    public EmpresaController(PedidoEmpresaService service, UsuarioRepository usuarioRepo, HistorialEquipoService historial,
                             com.dispenserlatienda.service.mapa.GeocodificadorService geo,
                             com.dispenserlatienda.service.empresa.PortalEmpresaService portal,
                             com.dispenserlatienda.service.servicio.FileStorageService archivos) {
        this.portal = portal;
        this.archivos = archivos;
        this.geo = geo;
        this.service = service;
        this.usuarioRepo = usuarioRepo;
        this.historial = historial;
    }

    @GetMapping("/datos")
    public Map<String, Object> datos(Authentication auth) {
        Usuario u = yo(auth);
        List<Map<String, Object>> datos = service.usuariosEmpresa().stream().filter(m -> u.getId().equals(m.get("id"))).toList();
        Map<String, Object> out = new java.util.LinkedHashMap<>();
        out.put("nombre", u.getNombre());
        out.put("empresa", datos.isEmpty() || datos.get(0).get("clienteNombre") == null ? "" : datos.get(0).get("clienteNombre"));
        out.put("sedeId", u.getSedeId()); // encargado de un lugar (null = toda la empresa)
        out.put("sedeNombre", datos.isEmpty() ? null : datos.get(0).get("sedeNombre"));
        // Funciones del portal que el admin habilitó para este cliente (9-oct-2026)
        out.put("funciones", com.dispenserlatienda.service.empresa.PortalConfigService.aMapa(config.de(u.getClienteId())));
        return out;
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

    // Etapa 2: informe del trabajo (cuando la visita quedó hecha)
    @GetMapping("/pedidos/{id}/informe")
    public List<Map<String, Object>> informe(@PathVariable Long id, Authentication auth) {
        PedidoEmpresaDTO p = service.obtenerDeEmpresa(yo(auth), id);
        return "HECHO".equals(p.estado()) ? historial.informeDeOrden(p.ordenId()) : List.of();
    }

    // Etapa 2: equipos de la empresa y la ficha permanente de cada uno
    @GetMapping("/equipos")
    public List<Map<String, Object>> equipos(Authentication auth) {
        Usuario u = yo(auth);
        return historial.equiposDeCliente(service.clienteDeEmpresa(u), u.getSedeId());
    }

    @GetMapping("/equipo")
    public Map<String, Object> equipo(@RequestParam String serie, Authentication auth) {
        Usuario u = yo(auth);
        return historial.fichaDeCliente(service.clienteDeEmpresa(u), u.getSedeId(), serie);
    }

    // Mapa de sus lugares (con sus equipos)
    @GetMapping("/mapa")
    public List<Map<String, Object>> mapa(Authentication auth) {
        Usuario yo = yo(auth);
        if (!config.de(yo.getClienteId()).mapa()) return List.of();
        List<Map<String, Object>> sedes = service.sedesDeEmpresa(yo);
        var ub = geo.ubicar(sedes.stream().map(m -> (String) m.get("direccion")).filter(java.util.Objects::nonNull).toList());
        java.util.List<Map<String, Object>> out = new java.util.ArrayList<>();
        for (Map<String, Object> s : sedes) {
            var g = geo.de(ub, (String) s.get("direccion"));
            Map<String, Object> m = new java.util.LinkedHashMap<>(s);
            m.put("lat", g != null ? g.getLat() : null);
            m.put("lng", g != null ? g.getLng() : null);
            m.put("geo", g != null ? g.getEstado() : "SIN_DIRECCION"); // M16: PENDIENTE = se está buscando
            out.add(m);
        }
        return out;
    }

    // Resumen del mes (equipos atendidos, sin precios)
    @GetMapping("/resumen")
    // Con desde/hasta (9-oct-2026): semana o rango libre, sin aprobación (eso es por mes)
    public Map<String, Object> resumen(@RequestParam(required = false) String mes,
                                       @RequestParam(required = false) String desde,
                                       @RequestParam(required = false) String hasta, Authentication auth) {
        Usuario u = yo(auth);
        Long cid = service.clienteDeEmpresa(u);
        if (desde != null && hasta != null) {
            java.time.LocalDate d = java.time.LocalDate.parse(desde), h = java.time.LocalDate.parse(hasta);
            if (h.isBefore(d)) throw new com.dispenserlatienda.exception.BusinessException("La fecha final es anterior a la inicial");
            if (java.time.temporal.ChronoUnit.DAYS.between(d, h) > 400) throw new com.dispenserlatienda.exception.BusinessException("Elegí un período de hasta un año");
            return historial.resumenRango(cid, u.getSedeId(), d, h);
        }
        java.time.YearMonth m = mes != null && !mes.isBlank() ? java.time.YearMonth.parse(mes) : java.time.YearMonth.now();
        Map<String, Object> out = new java.util.LinkedHashMap<>(historial.resumenMes(cid, u.getSedeId(), m));
        out.put("aprobacion", portal.aprobacion(cid, m.toString()));
        out.put("puedeAprobar", u.getSedeId() == null);
        out.put("limiteAprobacion", portal.limiteAprobacion(cid, m)); // null = no se aprueba solo
        return out;
    }

    // "Descargar todo" (9-oct-2026): equipos + todas sus visitas, sin precios
    @GetMapping("/exportar")
    public Map<String, Object> exportar(Authentication auth) {
        Usuario u = yo(auth);
        Long cid = service.clienteDeEmpresa(u);
        Map<String, Object> out = new java.util.LinkedHashMap<>();
        out.put("equipos", historial.mantenimientos(cid, u.getSedeId()));
        out.put("visitas", historial.visitasDeCliente(cid, u.getSedeId()));
        return out;
    }

    // Comentario sobre un trabajo hecho, sin puntaje (9-oct-2026)
    @PostMapping("/pedidos/{id}/observacion")
    public PedidoEmpresaDTO observar(@PathVariable Long id, @RequestBody Map<String, String> body, Authentication auth) {
        Usuario u = yo(auth);
        if (!config.de(u.getClienteId()).comentarios()) throw new org.springframework.security.access.AccessDeniedException("No habilitado");
        return service.observar(u, id, body.get("texto"));
    }

    // Etapa 4 (8-oct-2026) ─────────────────────────────────────────────────────

    // Fotos del problema al cargar un pedido (solo imágenes; se validan por contenido)
    @PostMapping(value = "/fotos", consumes = org.springframework.http.MediaType.MULTIPART_FORM_DATA_VALUE)
    public Map<String, String> subirFoto(@RequestParam("file") org.springframework.web.multipart.MultipartFile file) throws java.io.IOException {
        if (file.getSize() > 8 * 1024 * 1024) throw new com.dispenserlatienda.exception.BusinessException("La foto es muy pesada");
        String nombre = archivos.guardarArchivo(file);
        if (nombre.endsWith(".pdf")) {
            archivos.eliminarArchivo(nombre);
            throw new com.dispenserlatienda.exception.BusinessException("Solo fotos");
        }
        return Map.of("filename", nombre);
    }

    // Conformidad del trabajo terminado
    @PatchMapping("/pedidos/{id}/conformidad")
    public PedidoEmpresaDTO conformidad(@PathVariable Long id, @RequestBody Map<String, Object> body, Authentication auth) {
        // La calificación con estrellas solo si el admin la habilitó para este cliente (9-oct-2026)
        if (!config.de(yo(auth).getClienteId()).calificacion())
            throw new org.springframework.security.access.AccessDeniedException("La calificación no está habilitada");
        boolean conforme = Boolean.TRUE.equals(body.get("conforme"));
        Integer cal = body.get("calificacion") instanceof Number n ? n.intValue() : null;
        return service.conformidad(yo(auth), id, conforme, cal, (String) body.get("comentario"));
    }

    // Próximos mantenimientos de sus equipos
    @GetMapping("/mantenimientos")
    public List<Map<String, Object>> mantenimientos(Authentication auth) {
        Usuario u = yo(auth);
        return historial.mantenimientos(service.clienteDeEmpresa(u), u.getSedeId());
    }

    // Aprobar / observar el resumen del mes
    @PostMapping("/resumen/aprobacion")
    public Map<String, Object> aprobar(@RequestBody Map<String, Object> body, Authentication auth) {
        List<Long> obs = body.get("observados") instanceof List<?> l
            ? l.stream().filter(x -> x instanceof Number).map(x -> ((Number) x).longValue()).toList() : List.of();
        return portal.aprobar(yo(auth), (String) body.get("mes"), Boolean.TRUE.equals(body.get("aprobado")), (String) body.get("comentario"), obs);
    }

    @GetMapping("/indicadores")
    public Map<String, Object> indicadores(@RequestParam(defaultValue = "6") int meses, Authentication auth) {
        return portal.indicadores(yo(auth), meses);
    }

    @GetMapping("/sedes")
    public List<Map<String, Object>> sedes(Authentication auth) { return service.sedesDeEmpresa(yo(auth)); }

    private Usuario yo(Authentication auth) {
        return usuarioRepo.findByUsername(auth.getName()).orElseThrow();
    }
}
