package com.dispenserlatienda.service.empresa;

import com.dispenserlatienda.domain.empresa.PedidoComentario;
import com.dispenserlatienda.domain.empresa.PedidoEmpresa;
import com.dispenserlatienda.domain.notificacion.TipoNotificacion;
import com.dispenserlatienda.domain.orden.EstadoOrden;
import com.dispenserlatienda.domain.orden.OrdenVisita;
import com.dispenserlatienda.domain.sede.Sede;
import com.dispenserlatienda.domain.usuario.RolUsuario;
import com.dispenserlatienda.domain.usuario.Usuario;
import com.dispenserlatienda.dto.empresa.PedidoComentarioDTO;
import com.dispenserlatienda.dto.empresa.PedidoEmpresaCreateDTO;
import com.dispenserlatienda.dto.empresa.PedidoEmpresaDTO;
import com.dispenserlatienda.dto.orden.OrdenVisitaCreateDTO;
import com.dispenserlatienda.dto.orden.OrdenVisitaDTO;
import com.dispenserlatienda.exception.BusinessException;
import com.dispenserlatienda.exception.ResourceNotFoundException;
import com.dispenserlatienda.repository.cliente.ClienteRepository;
import com.dispenserlatienda.repository.empresa.PedidoComentarioRepository;
import com.dispenserlatienda.repository.empresa.PedidoEmpresaRepository;
import com.dispenserlatienda.repository.orden.OrdenVisitaRepository;
import com.dispenserlatienda.repository.sede.SedeRepository;
import com.dispenserlatienda.repository.usuario.UsuarioRepository;
import com.dispenserlatienda.service.notificacion.NotificacionService;
import com.dispenserlatienda.service.orden.OrdenVisitaService;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

// Portal Empresa (7-oct-2026): pedidos que carga un cliente empresa, la
// conversación de cada pedido y el paso a visita. Todo lo que ve la empresa
// pasa por acá y se filtra por SU cliente.
@Service
public class PedidoEmpresaService {

    private final PedidoEmpresaRepository repo;
    private final PedidoComentarioRepository comentarioRepo;
    private final OrdenVisitaRepository ordenRepo;
    private final OrdenVisitaService ordenService;
    private final SedeRepository sedeRepo;
    private final ClienteRepository clienteRepo;
    private final UsuarioRepository usuarioRepo;
    private final NotificacionService notificaciones;

    public PedidoEmpresaService(PedidoEmpresaRepository repo, PedidoComentarioRepository comentarioRepo,
                                OrdenVisitaRepository ordenRepo, OrdenVisitaService ordenService,
                                SedeRepository sedeRepo, ClienteRepository clienteRepo,
                                UsuarioRepository usuarioRepo, NotificacionService notificaciones) {
        this.repo = repo;
        this.comentarioRepo = comentarioRepo;
        this.ordenRepo = ordenRepo;
        this.ordenService = ordenService;
        this.sedeRepo = sedeRepo;
        this.clienteRepo = clienteRepo;
        this.usuarioRepo = usuarioRepo;
        this.notificaciones = notificaciones;
    }

    // ── Empresa ──────────────────────────────────────────────────────────────

    public List<PedidoEmpresaDTO> listarDeEmpresa(Usuario empresa) {
        return aDTOs(repo.findByClienteIdOrderByCreadoEnDesc(clienteDe(empresa)));
    }

    public List<Map<String, Object>> sedesDeEmpresa(Usuario empresa) {
        List<Map<String, Object>> out = new ArrayList<>();
        for (Sede s : sedeRepo.findByClienteIdAndActivaTrue(clienteDe(empresa))) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", s.getId());
            m.put("nombre", s.getNombreSede());
            m.put("direccion", s.getDireccion());
            m.put("series", s.getEquipos() == null ? List.of() : s.getEquipos().stream()
                .map(e -> e.getNumeroSerie()).filter(Objects::nonNull).toList());
            out.add(m);
        }
        return out;
    }

    @Transactional
    public PedidoEmpresaDTO crear(Usuario empresa, PedidoEmpresaCreateDTO dto) {
        Long clienteId = clienteDe(empresa);
        PedidoEmpresa p = new PedidoEmpresa();
        p.setClienteId(clienteId);
        p.setClienteNombre(clienteRepo.findById(clienteId).map(c -> c.getNombre()).orElse(null));
        p.setCreadoPorId(empresa.getId());
        p.setCreadoPorNombre(empresa.getNombre());
        String direccion = limpio(dto.direccion());
        String lugar = limpio(dto.lugar());
        if (dto.sedeId() != null) {
            Sede s = sedeRepo.findById(dto.sedeId()).orElseThrow(() -> new BusinessException("Ese lugar no existe"));
            if (s.getCliente() == null || !clienteId.equals(s.getCliente().getId())) throw new AccessDeniedException("Ese lugar no es tuyo");
            p.setSedeId(s.getId());
            if (lugar == null) lugar = s.getNombreSede();
            if (direccion == null) direccion = s.getDireccion();
        }
        if (direccion == null) throw new BusinessException("Falta la dirección");
        String motivo = limpio(dto.motivo());
        if (motivo == null) throw new BusinessException("Elegí el motivo");
        p.setLugar(corto(lugar, 300));
        p.setDireccion(corto(direccion, 400));
        p.setEquipoSerie(corto(limpio(dto.equipoSerie()), 200));
        p.setMotivo(corto(motivo, 120));
        p.setDetalle(limpio(dto.detalle()));
        p.setUrgente(Boolean.TRUE.equals(dto.urgente()));
        repo.save(p);

        String texto = motivo + (p.getEquipoSerie() != null ? " · N/S " + p.getEquipoSerie() : "")
            + "\n📍 " + (lugar != null && !lugar.equalsIgnoreCase(direccion) ? lugar + " · " : "") + direccion
            + (p.getDetalle() != null ? "\n" + p.getDetalle() : "");
        avisarAdmins(empresa, (p.isUrgente() ? "🔴 Pedido urgente #" : "Pedido nuevo #") + p.getId() + " · " + nombreCliente(p), texto, true);
        return aDTO(p);
    }

    @Transactional
    public PedidoEmpresaDTO cancelarPorEmpresa(Usuario empresa, Long id) {
        PedidoEmpresa p = deEmpresa(empresa, id);
        if (p.getOrdenId() != null) throw new BusinessException("Ya está agendado: escribinos en el pedido para cancelarlo");
        p.setEstado("CANCELADO");
        p.setActualizadoEn(LocalDateTime.now());
        avisarAdmins(empresa, "Pedido cancelado #" + p.getId() + " · " + nombreCliente(p), p.getMotivo() + " · " + p.getDireccion(), false);
        return aDTO(p);
    }

    public PedidoEmpresaDTO obtenerDeEmpresa(Usuario empresa, Long id) {
        return aDTO(deEmpresa(empresa, id));
    }

    public PedidoEmpresaDTO obtenerPorOrdenDeEmpresa(Usuario empresa, Long ordenId) {
        PedidoEmpresa p = repo.findFirstByOrdenId(ordenId).orElseThrow(() -> new ResourceNotFoundException("Pedido no encontrado"));
        return aDTO(deEmpresa(empresa, p.getId()));
    }

    // ── Comentarios (los dos lados) ──────────────────────────────────────────

    public List<PedidoComentarioDTO> comentarios(Usuario quien, Long pedidoId) {
        verificarAcceso(quien, pedidoId);
        return comentarioRepo.findByPedidoIdOrderByCreadoEnAsc(pedidoId).stream()
            .map(c -> new PedidoComentarioDTO(c.getId(), c.getAutorNombre(), c.isDeEmpresa(), c.getTexto(), c.getCreadoEn()))
            .toList();
    }

    @Transactional
    public PedidoComentarioDTO comentar(Usuario quien, Long pedidoId, String texto) {
        PedidoEmpresa p = verificarAcceso(quien, pedidoId);
        String t = limpio(texto);
        if (t == null) throw new BusinessException("Escribí el comentario");
        boolean deEmpresa = quien.getRol() == RolUsuario.EMPRESA;
        PedidoComentario c = new PedidoComentario();
        c.setPedidoId(p.getId());
        c.setAutorId(quien.getId());
        c.setAutorNombre(deEmpresa ? quien.getNombre() : "Dispenser La Tienda");
        c.setDeEmpresa(deEmpresa);
        c.setTexto(t);
        comentarioRepo.save(c);
        p.setActualizadoEn(LocalDateTime.now());
        String resumen = corto(t, 900);
        if (deEmpresa) {
            avisarAdmins(quien, "Comentario en pedido #" + p.getId() + " · " + nombreCliente(p), resumen, false);
            // El técnico de la visita también se entera (solo lee; no le escribe a la empresa)
            if (p.getOrdenId() != null) ordenRepo.findById(p.getOrdenId()).ifPresent(o -> {
                if (o.getTecnico() != null && List.of(EstadoOrden.PENDIENTE, EstadoOrden.EN_CAMINO, EstadoOrden.EN_SITIO).contains(o.getEstado()))
                    notificaciones.notificar(TipoNotificacion.MENSAJE_LIBRE, o.getTecnico().getId(), null,
                        "Mensaje de " + nombreCliente(p) + " · " + (p.getLugar() != null ? p.getLugar() : p.getMotivo()),
                        resumen, o.getId(), false);
            });
        } else {
            avisarEmpresa(p.getClienteId(), "Respuesta en tu pedido #" + p.getId(), resumen);
        }
        return new PedidoComentarioDTO(c.getId(), c.getAutorNombre(), c.isDeEmpresa(), c.getTexto(), c.getCreadoEn());
    }

    // Técnico (7-oct-2026): la conversación del pedido de SU visita, solo para leer
    public Map<String, Object> conversacionDeOrden(Usuario quien, Long ordenId) {
        OrdenVisita o = ordenRepo.findById(ordenId).orElseThrow(() -> new ResourceNotFoundException("Visita no encontrada"));
        if (quien.getRol() != RolUsuario.ADMIN && (o.getTecnico() == null || !o.getTecnico().getId().equals(quien.getId())))
            throw new AccessDeniedException("No es tu visita");
        Map<String, Object> out = new LinkedHashMap<>();
        Optional<PedidoEmpresa> p = repo.findFirstByOrdenId(ordenId);
        if (p.isEmpty()) { out.put("pedidoId", null); out.put("comentarios", List.of()); return out; }
        out.put("pedidoId", p.get().getId());
        out.put("empresa", nombreCliente(p.get()));
        out.put("comentarios", comentarioRepo.findByPedidoIdOrderByCreadoEnAsc(p.get().getId()).stream()
            .map(c -> new PedidoComentarioDTO(c.getId(), c.getAutorNombre(), c.isDeEmpresa(), c.getTexto(), c.getCreadoEn())).toList());
        return out;
    }

    // ── Admin ────────────────────────────────────────────────────────────────

    public List<PedidoEmpresaDTO> listarTodos() {
        return aDTOs(repo.findAllByOrderByCreadoEnDesc());
    }

    public PedidoEmpresaDTO obtener(Long id) {
        return aDTO(repo.findById(id).orElseThrow(() -> new ResourceNotFoundException("Pedido no encontrado")));
    }

    public long nuevosSinAgendar() {
        return repo.countByEstadoAndOrdenIdIsNull("NUEVO");
    }

    // Pasa el pedido a visita: crea la OrdenVisita (eso ya le avisa al técnico) y
    // le avisa a la empresa el día.
    @Transactional
    public PedidoEmpresaDTO agendar(Long id, Long tecnicoId, LocalDate fecha, String hora) {
        PedidoEmpresa p = repo.findById(id).orElseThrow(() -> new ResourceNotFoundException("Pedido no encontrado"));
        if ("CANCELADO".equals(p.getEstado())) throw new BusinessException("El pedido está cancelado");
        if (p.getOrdenId() != null) {
            Optional<OrdenVisita> o = ordenRepo.findById(p.getOrdenId());
            if (o.isPresent() && List.of(EstadoOrden.PENDIENTE, EstadoOrden.EN_CAMINO, EstadoOrden.EN_SITIO).contains(o.get().getEstado()))
                throw new BusinessException("Ya tiene una visita agendada: reprogramala desde la visita");
        }
        if (tecnicoId == null || fecha == null) throw new BusinessException("Elegí técnico y día");
        String desc = "Pedido #" + p.getId() + " de " + nombreCliente(p)
            + (p.getEquipoSerie() != null ? "\nEquipo N/S: " + p.getEquipoSerie() : "")
            + (p.getDetalle() != null ? "\n" + p.getDetalle() : "");
        OrdenVisitaDTO o = ordenService.crear(new OrdenVisitaCreateDTO(
            tecnicoId,
            p.getMotivo() + (p.getLugar() != null ? " · " + p.getLugar() : ""),
            desc,
            p.getDireccion(),
            p.getClienteId(),
            nombreCliente(p),
            null,
            p.isUrgente() ? "URGENTE" : "NORMAL",
            fecha,
            hora,
            null, null, null,
            p.getEquipoSerie()));
        p.setOrdenId(o.id());
        p.setEstado("NUEVO");
        p.setActualizadoEn(LocalDateTime.now());
        avisarEmpresa(p.getClienteId(), "Pedido #" + p.getId() + " agendado",
            p.getMotivo() + " · " + cuando(fecha, hora) + "\n📍 " + p.getDireccion());
        return aDTO(p);
    }

    @Transactional
    public PedidoEmpresaDTO rechazar(Long id, String motivo) {
        PedidoEmpresa p = repo.findById(id).orElseThrow(() -> new ResourceNotFoundException("Pedido no encontrado"));
        if (p.getOrdenId() != null) {
            Optional<OrdenVisita> o = ordenRepo.findById(p.getOrdenId());
            if (o.isPresent() && o.get().getEstado() == EstadoOrden.COMPLETADA)
                throw new BusinessException("Ese pedido ya se hizo: no se puede cancelar");
            ordenService.cancelarPorPedido(p.getOrdenId());
        }
        p.setEstado("CANCELADO");
        p.setActualizadoEn(LocalDateTime.now());
        String m = limpio(motivo);
        if (m != null) {
            PedidoComentario c = new PedidoComentario();
            c.setPedidoId(p.getId());
            c.setAutorNombre("Dispenser La Tienda");
            c.setDeEmpresa(false);
            c.setTexto("Pedido cancelado: " + m);
            comentarioRepo.save(c);
        }
        avisarEmpresa(p.getClienteId(), "Pedido #" + p.getId() + " cancelado", m != null ? m : p.getMotivo());
        return aDTO(p);
    }

    // Usuarios empresa (para la pantalla de Usuarios del admin)
    public List<Map<String, Object>> usuariosEmpresa() {
        List<Map<String, Object>> out = new ArrayList<>();
        for (Usuario u : usuarioRepo.findAll()) {
            if (u.getRol() != RolUsuario.EMPRESA) continue;
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", u.getId());
            m.put("clienteId", u.getClienteId());
            m.put("clienteNombre", u.getClienteId() == null ? null : clienteRepo.findById(u.getClienteId()).map(c -> c.getNombre()).orElse(null));
            out.add(m);
        }
        return out;
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    public Long clienteDeEmpresa(Usuario empresa) { return clienteDe(empresa); }

    private Long clienteDe(Usuario empresa) {
        if (empresa.getRol() != RolUsuario.EMPRESA || empresa.getClienteId() == null)
            throw new AccessDeniedException("Usuario sin empresa asignada");
        return empresa.getClienteId();
    }

    private PedidoEmpresa deEmpresa(Usuario empresa, Long id) {
        PedidoEmpresa p = repo.findById(id).orElseThrow(() -> new ResourceNotFoundException("Pedido no encontrado"));
        if (!p.getClienteId().equals(clienteDe(empresa))) throw new AccessDeniedException("Ese pedido no es tuyo");
        return p;
    }

    private PedidoEmpresa verificarAcceso(Usuario quien, Long id) {
        if (quien.getRol() == RolUsuario.ADMIN) return repo.findById(id).orElseThrow(() -> new ResourceNotFoundException("Pedido no encontrado"));
        if (quien.getRol() == RolUsuario.EMPRESA) return deEmpresa(quien, id);
        throw new AccessDeniedException("Sin acceso");
    }

    private void avisarAdmins(Usuario origen, String titulo, String mensaje, boolean whatsapp) {
        usuarioRepo.findAll().stream()
            .filter(u -> u.getRol() == RolUsuario.ADMIN && u.isActivo())
            .forEach(a -> notificaciones.notificar(TipoNotificacion.MENSAJE_LIBRE, a.getId(),
                origen != null ? origen.getId() : null, titulo, corto(mensaje, 1000), null, whatsapp));
    }

    // Lo usa también OrdenVisitaService (cambios de estado de la visita)
    public void avisarEmpresa(Long clienteId, String titulo, String mensaje) {
        usuarioRepo.findAll().stream()
            .filter(u -> u.getRol() == RolUsuario.EMPRESA && u.isActivo() && clienteId.equals(u.getClienteId()))
            .forEach(u -> notificaciones.notificar(TipoNotificacion.MENSAJE_LIBRE, u.getId(), null,
                titulo, corto(mensaje, 1000), null, false));
    }

    public static String cuando(LocalDate fecha, String hora) {
        String[] dias = {"lun", "mar", "mié", "jue", "vie", "sáb", "dom"};
        String f = fecha == null ? "sin fecha" : dias[fecha.getDayOfWeek().getValue() - 1] + " " + fecha.format(DateTimeFormatter.ofPattern("dd/MM"));
        String h = hora == null || hora.isBlank() ? "" : " · " + (hora.length() > 5 && hora.charAt(2) == ':' ? hora.substring(0, 5) : hora);
        return f + h;
    }

    private String nombreCliente(PedidoEmpresa p) {
        return p.getClienteNombre() != null ? p.getClienteNombre() : "Empresa";
    }

    private static String limpio(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }

    private static String corto(String s, int max) {
        return s == null ? null : (s.length() > max ? s.substring(0, max - 1) + "…" : s);
    }

    private List<PedidoEmpresaDTO> aDTOs(List<PedidoEmpresa> lista) {
        Set<Long> ids = new HashSet<>();
        lista.forEach(p -> { if (p.getOrdenId() != null) ids.add(p.getOrdenId()); });
        Map<Long, OrdenVisita> ordenes = new HashMap<>();
        if (!ids.isEmpty()) ordenRepo.findAllById(ids).forEach(o -> ordenes.put(o.getId(), o));
        return lista.stream().map(p -> aDTO(p, ordenes.get(p.getOrdenId()))).toList();
    }

    private PedidoEmpresaDTO aDTO(PedidoEmpresa p) {
        return aDTO(p, p.getOrdenId() != null ? ordenRepo.findById(p.getOrdenId()).orElse(null) : null);
    }

    private PedidoEmpresaDTO aDTO(PedidoEmpresa p, OrdenVisita o) {
        String estado = p.getEstado();
        LocalDate fecha = null; String hora = null; String tecnico = null;
        if (!"CANCELADO".equals(estado) && o != null) {
            fecha = o.getFechaProgramada();
            hora = o.getHoraEstimada();
            tecnico = o.getTecnico() != null ? o.getTecnico().getNombre().split(" ")[0] : null;
            estado = switch (o.getEstado()) {
                case PENDIENTE -> "AGENDADO";
                case EN_CAMINO -> "EN_CAMINO";
                case EN_SITIO -> "EN_CURSO";
                case COMPLETADA -> "HECHO";
                case NO_ATENDIDO -> "NO_ATENDIDO";
                default -> "PAUSADO";
            };
        }
        return new PedidoEmpresaDTO(p.getId(), p.getClienteId(), p.getClienteNombre(), p.getCreadoPorNombre(),
            p.getSedeId(), p.getLugar(), p.getDireccion(), p.getEquipoSerie(), p.getMotivo(), p.getDetalle(),
            p.isUrgente(), estado, p.getOrdenId(), fecha, hora, tecnico,
            comentarioRepo.countByPedidoId(p.getId()), p.getCreadoEn(), p.getActualizadoEn());
    }
}
