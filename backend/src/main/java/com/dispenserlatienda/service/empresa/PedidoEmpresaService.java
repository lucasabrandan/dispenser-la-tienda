package com.dispenserlatienda.service.empresa;

import com.dispenserlatienda.domain.empresa.PedidoComentario;
import com.dispenserlatienda.domain.empresa.PedidoEmpresa;
import com.dispenserlatienda.domain.equipo.Equipo;
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
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
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
        Long sede = empresa.getSedeId();
        return aDTOs(repo.findByClienteIdOrderByCreadoEnDesc(clienteDe(empresa)).stream()
            .filter(p -> sede == null || sede.equals(p.getSedeId())).toList());
    }

    public List<Map<String, Object>> sedesDeEmpresa(Usuario empresa) {
        List<Map<String, Object>> out = new ArrayList<>();
        for (Sede s : sedeRepo.findByClienteIdAndActivaTrue(clienteDe(empresa))) {
            if (empresa.getSedeId() != null && !empresa.getSedeId().equals(s.getId())) continue; // encargado de un lugar
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", s.getId());
            m.put("nombre", s.getNombreSede());
            m.put("direccion", s.getDireccion());
            m.put("series", s.getEquipos() == null ? List.of() : s.getEquipos().stream()
                .map(e -> e.getNumeroSerie()).filter(Objects::nonNull).toList());
            // Carga guiada (10-oct-2026): cada equipo con modelo y ubicación, para elegirlo de un toque
            List<Map<String, String>> eqs = new ArrayList<>();
            if (s.getEquipos() != null) for (var e : s.getEquipos()) {
                if (e.getNumeroSerie() == null) continue;
                Map<String, String> x = new LinkedHashMap<>();
                x.put("serie", e.getNumeroSerie());
                x.put("modelo", e.getModelo());
                x.put("ubicacion", e.getUbicacion());
                eqs.add(x);
            }
            m.put("equipos", eqs);
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
        boolean clienteNuevo = false;
        if (dto.sedeId() == null && dto.clienteNuevo() != null) {
            // Cliente de la empresa que no estaba cargado (10-oct-2026): queda como un lugar suyo
            if (empresa.getSedeId() != null) throw new BusinessException("Elegí tu lugar");
            Lugar l = lugarNuevo(clienteId, dto.clienteNuevo());
            clienteNuevo = l.nuevo();
            p.setSedeId(l.sede().getId());
            lugar = l.sede().getNombreSede();
            direccion = l.sede().getDireccion();
        } else if (dto.sedeId() != null) {
            Sede s = sedeRepo.findById(dto.sedeId()).orElseThrow(() -> new BusinessException("Ese lugar no existe"));
            if (s.getCliente() == null || !clienteId.equals(s.getCliente().getId())) throw new AccessDeniedException("Ese lugar no es tuyo");
            p.setSedeId(s.getId());
            if (lugar == null) lugar = s.getNombreSede();
            if (direccion == null) direccion = s.getDireccion();
        }
        // Encargado de un lugar (8-oct-2026): solo pide para el suyo
        if (empresa.getSedeId() != null && !empresa.getSedeId().equals(p.getSedeId()))
            throw new BusinessException("Elegí tu lugar");
        if (direccion == null) throw new BusinessException("Falta la dirección");
        p.setFotos(fotosValidas(dto.fotos()));
        String motivo = limpio(dto.motivo());
        List<Map<String, String>> equipos = equiposValidos(dto.equipos(), motivo);
        if (equipos != null) {
            // Varios equipos (10-oct-2026): cada uno con lo que le pasa; el motivo del pedido
            // es ese mismo si es uno solo para todos, o "Varios"
            p.setEquipos(aJson(equipos));
            p.setEquipoSerie(corto(String.join(", ", equipos.stream().map(e -> e.get("serie")).filter(Objects::nonNull).toList()), 200));
            if (p.getEquipoSerie() != null && p.getEquipoSerie().isEmpty()) p.setEquipoSerie(null);
            Set<String> motivos = new LinkedHashSet<>(equipos.stream().map(e -> e.get("motivo")).toList());
            motivo = motivos.size() == 1 ? motivos.iterator().next() : "Varios (" + equipos.size() + " equipos)";
        } else {
            p.setEquipoSerie(corto(limpio(dto.equipoSerie()), 200));
        }
        if (motivo == null) throw new BusinessException("Elegí el motivo");
        List<Map<String, String>> ventanas = ventanasValidas(dto.ventanas());
        p.setVentanas(aJson(ventanas));
        p.setLugar(corto(lugar, 300));
        p.setDireccion(corto(direccion, 400));
        p.setMotivo(corto(motivo, 120));
        p.setDetalle(limpio(dto.detalle()));
        p.setUrgente(Boolean.TRUE.equals(dto.urgente()));
        repo.save(p);

        String texto = (equipos != null ? motivo : motivo + (p.getEquipoSerie() != null ? " · N/S " + p.getEquipoSerie() : ""))
            + "\n📍 " + (lugar != null && !lugar.equalsIgnoreCase(direccion) ? lugar + " · " : "") + direccion
            + (clienteNuevo ? " (cliente nuevo)" : "")
            + (equipos != null ? equiposTexto(equipos) : "")
            + (ventanas != null ? "\n🗓️ Pueden: " + ventanasTexto(ventanas) : "")
            + (p.getDetalle() != null ? "\n" + p.getDetalle() : "")
            + (p.getFotos() != null ? "\n📷 " + p.getFotos().split(",").length + " foto(s)" : "");
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
            avisarEmpresa(p.getClienteId(), p.getSedeId(), "Respuesta en tu pedido #" + p.getId(), resumen);
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
        out.put("fotos", listaFotos(p.get().getFotos()));
        out.put("detalle", p.get().getDetalle());
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
        return agendar(id, tecnicoId, fecha, hora, false);
    }

    @Transactional
    public PedidoEmpresaDTO agendar(Long id, Long tecnicoId, LocalDate fecha, String hora, boolean aCoordinar) {
        PedidoEmpresa p = repo.findById(id).orElseThrow(() -> new ResourceNotFoundException("Pedido no encontrado"));
        if ("CANCELADO".equals(p.getEstado())) throw new BusinessException("El pedido está cancelado");
        if (p.getOrdenId() != null) {
            Optional<OrdenVisita> o = ordenRepo.findById(p.getOrdenId());
            if (o.isPresent() && List.of(EstadoOrden.PENDIENTE, EstadoOrden.EN_CAMINO, EstadoOrden.EN_SITIO).contains(o.get().getEstado()))
                throw new BusinessException("Ya tiene una visita agendada: reprogramala desde la visita");
        }
        List<Map<String, String>> vts = leerLista(p.getVentanas());
        boolean coordinar = aCoordinar && !vts.isEmpty();
        if (coordinar) {
            if (fecha == null) fecha = proximaFecha(vts);
            hora = null;
        }
        if (tecnicoId == null || fecha == null) throw new BusinessException(coordinar ? "Elegí el técnico" : "Elegí técnico y día");
        List<Map<String, String>> eqs = leerLista(p.getEquipos());
        String desc = "Pedido #" + p.getId() + " de " + nombreCliente(p)
            + (!eqs.isEmpty() ? equiposTexto(eqs) : p.getEquipoSerie() != null ? "\nEquipo N/S: " + p.getEquipoSerie() : "")
            + (!vts.isEmpty() ? "\nPueden: " + ventanasTexto(vts) : "")
            + (p.getDetalle() != null ? "\n" + p.getDetalle() : "");
        String series = eqs.isEmpty() ? p.getEquipoSerie()
            : String.join(",", eqs.stream().map(e -> e.get("serie")).filter(Objects::nonNull).toList());
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
            series == null || series.isEmpty() ? null : series), coordinar ? aJson(vts) : null);
        p.setOrdenId(o.id());
        p.setEstado("NUEVO");
        // Volver a ir (por un reclamo): la conformidad anterior queda en la conversación
        p.setConformidad(null); p.setCalificacion(null); p.setConformidadComentario(null);
        p.setConformidadEn(null); p.setConformidadPor(null);
        p.setObservacionEstado(null); p.setObservacionRespuesta(null); p.setObservacionCerradaEn(null);
        p.setActualizadoEn(LocalDateTime.now());
        if (coordinar)
            avisarEmpresa(p.getClienteId(), p.getSedeId(), "Pedido #" + p.getId() + " asignado",
                p.getMotivo() + " · el técnico elige el día dentro de lo que marcaste (" + ventanasTexto(vts)
                    + ") y te avisamos\n📍 " + p.getDireccion());
        else
            avisarEmpresa(p.getClienteId(), p.getSedeId(), "Pedido #" + p.getId() + " agendado",
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
        avisarEmpresa(p.getClienteId(), p.getSedeId(), "Pedido #" + p.getId() + " cancelado", m != null ? m : p.getMotivo());
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
            m.put("sedeId", u.getSedeId());
            m.put("sedeNombre", u.getSedeId() == null ? null : sedeRepo.findById(u.getSedeId()).map(Sede::getNombreSede).orElse(null));
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
        if (empresa.getSedeId() != null && !empresa.getSedeId().equals(p.getSedeId())) throw new AccessDeniedException("Ese pedido es de otro lugar");
        return p;
    }

    // Fotos del pedido: solo nombres de archivo subidos por /api/empresa/fotos (sin rutas)
    private static String fotosValidas(List<String> fotos) {
        if (fotos == null) return null;
        List<String> ok = fotos.stream().filter(Objects::nonNull).map(String::trim)
            .filter(f -> f.matches("[A-Za-z0-9._-]{5,200}")).limit(4).toList();
        return ok.isEmpty() ? null : String.join(",", ok);
    }

    private static List<String> listaFotos(String fotos) {
        return fotos == null || fotos.isBlank() ? List.of() : Arrays.asList(fotos.split(","));
    }

    // ── Conformidad del trabajo (8-oct-2026) ─────────────────────────────────
    // Cuando la visita queda hecha, la empresa confirma "Conforme" (con estrellas) o
    // avisa "Hay un problema": eso abre un reclamo en el pedido y le avisa al admin.
    @Transactional
    public PedidoEmpresaDTO conformidad(Usuario empresa, Long id, boolean conforme, Integer calificacion, String comentario) {
        PedidoEmpresa p = deEmpresa(empresa, id);
        PedidoEmpresaDTO actual = aDTO(p);
        if (!"HECHO".equals(actual.estado())) throw new BusinessException("Todavía no está terminado");
        String com = limpio(comentario);
        if (!conforme && com == null) throw new BusinessException("Contanos qué pasó");
        Integer cal = calificacion == null ? null : Math.max(1, Math.min(5, calificacion));
        p.setConformidad(conforme ? "CONFORME" : "PROBLEMA");
        p.setCalificacion(cal);
        p.setConformidadComentario(com);
        p.setConformidadEn(LocalDateTime.now());
        p.setConformidadPor(empresa.getNombre());
        p.setActualizadoEn(LocalDateTime.now());
        String estrellas = cal != null ? " " + "★".repeat(cal) + "☆".repeat(5 - cal) : "";
        PedidoComentario c = new PedidoComentario();
        c.setPedidoId(p.getId());
        c.setAutorId(empresa.getId());
        c.setAutorNombre(empresa.getNombre());
        c.setDeEmpresa(true);
        c.setTexto(conforme ? "✓ Conforme con el trabajo" + estrellas + (com != null ? "\n" + com : "")
                            : "⚠️ Hay un problema con el trabajo" + estrellas + "\n" + com);
        comentarioRepo.save(c);
        if (conforme) {
            avisarAdmins(empresa, "✓ Conforme · pedido #" + p.getId() + " · " + nombreCliente(p) + estrellas, com != null ? com : p.getMotivo(), false);
        } else {
            avisarAdmins(empresa, "🔴 Reclamo · pedido #" + p.getId() + " · " + nombreCliente(p), com, true);
        }
        return aDTO(p);
    }

    // ── Observación sin puntaje (9-oct-2026) ─────────────────────────────────
    // Para clientes sin calificación: el trabajo hecho queda "Entregado" solo; si la
    // empresa quiere, deja un comentario. No suma ni resta ningún promedio: le llega
    // al admin como observación pendiente y él la cierra con una respuesta.
    @Transactional
    public PedidoEmpresaDTO observar(Usuario empresa, Long id, String texto) {
        PedidoEmpresa p = deEmpresa(empresa, id);
        if (!"HECHO".equals(aDTO(p).estado())) throw new BusinessException("Todavía no está terminado");
        String t = limpio(texto);
        if (t == null) throw new BusinessException("Escribí el comentario");
        t = corto(t, 2000);
        p.setConformidad("OBSERVADO");
        p.setCalificacion(null);
        p.setConformidadComentario(t);
        p.setConformidadEn(LocalDateTime.now());
        p.setConformidadPor(empresa.getNombre());
        p.setObservacionEstado("PENDIENTE");
        p.setObservacionRespuesta(null);
        p.setObservacionCerradaEn(null);
        p.setActualizadoEn(LocalDateTime.now());
        PedidoComentario c = new PedidoComentario();
        c.setPedidoId(p.getId());
        c.setAutorId(empresa.getId());
        c.setAutorNombre(empresa.getNombre());
        c.setDeEmpresa(true);
        c.setTexto("💬 Comentario sobre el trabajo\n" + t);
        comentarioRepo.save(c);
        avisarAdmins(empresa, "💬 Observación · pedido #" + p.getId() + " · " + nombreCliente(p), t, false);
        return aDTO(p);
    }

    // El admin cierra la observación: RESUELTA (se ocupó) o NO_CORRESPONDE (no era por el trabajo)
    @Transactional
    public PedidoEmpresaDTO cerrarObservacion(Usuario admin, Long id, String estado, String nota) {
        PedidoEmpresa p = repo.findById(id).orElseThrow(() -> new ResourceNotFoundException("Pedido no encontrado"));
        if (p.getConformidad() == null || "CONFORME".equals(p.getConformidad()))
            throw new BusinessException("Ese pedido no tiene observaciones");
        String e = "NO_CORRESPONDE".equals(estado) ? "NO_CORRESPONDE" : "RESUELTA";
        String n = limpio(nota);
        if ("NO_CORRESPONDE".equals(e) && n == null) throw new BusinessException("Contale a la empresa por qué no corresponde");
        p.setObservacionEstado(e);
        p.setObservacionRespuesta(n);
        p.setObservacionCerradaEn(LocalDateTime.now());
        p.setActualizadoEn(LocalDateTime.now());
        String titulo = "RESUELTA".equals(e) ? "✓ Observación resuelta" : "Respuesta a tu observación";
        PedidoComentario c = new PedidoComentario();
        c.setPedidoId(p.getId());
        c.setAutorId(admin.getId());
        c.setAutorNombre("Dispenser La Tienda");
        c.setDeEmpresa(false);
        c.setTexto(titulo + (n != null ? "\n" + n : ""));
        comentarioRepo.save(c);
        avisarEmpresa(p.getClienteId(), p.getSedeId(), titulo + " · pedido #" + p.getId(), n != null ? n : p.getMotivo());
        return aDTO(p);
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
    public void avisarEmpresa(Long clienteId, String titulo, String mensaje) { avisarEmpresa(clienteId, null, titulo, mensaje); }

    // sedeId: el encargado de un lugar solo recibe lo de su lugar (los generales, todo)
    public void avisarEmpresa(Long clienteId, Long sedeId, String titulo, String mensaje) {
        usuarioRepo.findAll().stream()
            .filter(u -> u.getRol() == RolUsuario.EMPRESA && u.isActivo() && clienteId.equals(u.getClienteId()))
            .filter(u -> u.getSedeId() == null || u.getSedeId().equals(sedeId))
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
            // Día "a coordinar": el que tiene la visita es provisorio, no se muestra (10-oct-2026)
            fecha = o.getVentanasCliente() == null ? o.getFechaProgramada() : null;
            hora = o.getVentanasCliente() == null ? o.getHoraEstimada() : null;
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
            comentarioRepo.countByPedidoId(p.getId()), p.getCreadoEn(), p.getActualizadoEn(),
            listaFotos(p.getFotos()), p.getConformidad(), p.getCalificacion(), p.getConformidadComentario(),
            p.getConformidadEn(), p.getConformidadPor(),
            p.getObservacionEstado(), p.getObservacionRespuesta(), p.getObservacionCerradaEn(),
            leerLista(p.getEquipos()), leerLista(p.getVentanas()));
    }

    // ── Carga guiada (10-oct-2026) ──────────────────────────────────────────

    private static final ObjectMapper JSON = new ObjectMapper();
    public static final List<String> DIAS = List.of("LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES", "SABADO");
    public static final List<String> FRANJAS = List.of("08:00-12:00", "12:00-14:00", "14:00-18:00", "18:00-20:00");
    private static final List<String> DIAS_CORTO = List.of("Lun", "Mar", "Mié", "Jue", "Vie", "Sáb");
    private static final List<String> FRANJAS_CORTO = List.of("mañana", "mediodía", "tarde", "tarde-noche");

    // Crea el lugar (sede) con los datos que cargó la empresa. Si ya hay uno con el mismo
    // nombre y la misma dirección se usa ese; con el mismo nombre y otra dirección, se avisa.
    private record Lugar(Sede sede, boolean nuevo) {}

    private Lugar lugarNuevo(Long clienteId, PedidoEmpresaCreateDTO.ClienteNuevo c) {
        String nombre = corto(limpio(c.nombre()), 120), calle = corto(limpio(c.calle()), 120);
        String numero = corto(limpio(c.numero()), 20), piso = corto(limpio(c.piso()), 20);
        String depto = corto(limpio(c.depto()), 20), localidad = corto(limpio(c.localidad()), 120);
        String notas = corto(limpio(c.notas()), 500);
        if (nombre == null || nombre.length() < 2) throw new BusinessException("Falta el nombre del cliente");
        if (calle == null) throw new BusinessException("Falta la calle");
        if (localidad == null) throw new BusinessException("Falta la localidad");
        String dir = corto(calle + (numero != null ? " " + numero : "") + (piso != null ? ", Piso " + piso : "")
            + (depto != null ? " Depto " + depto : "") + ", " + localidad, 255);
        Optional<Sede> mismo = sedeRepo.findByClienteId(clienteId).stream()
            .filter(s -> nombre.equalsIgnoreCase(s.getNombreSede())).findFirst();
        if (mismo.isPresent()) {
            Sede s = mismo.get();
            if (s.isActiva() && s.getDireccion() != null && s.getDireccion().equalsIgnoreCase(dir)) return new Lugar(s, false);
            throw new BusinessException("Ya tenés un cliente llamado " + s.getNombreSede() + ": elegilo de la lista o agregale algo para diferenciarlo");
        }
        var cliente = clienteRepo.findById(clienteId).orElseThrow(() -> new ResourceNotFoundException("Cliente no encontrado"));
        return new Lugar(sedeRepo.save(new Sede(cliente, nombre, calle, numero, piso, depto, localidad, null, dir, notas)), true);
    }

    // Sin repetir N/S, hasta 30; cada uno con lo que le pasa (o el motivo del pedido)
    private static List<Map<String, String>> equiposValidos(List<PedidoEmpresaCreateDTO.EquipoPedido> lista, String motivoPedido) {
        if (lista == null) return null;
        List<Map<String, String>> out = new ArrayList<>();
        Set<String> vistas = new HashSet<>();
        for (var e : lista) {
            if (e == null) continue;
            String serie = corto(Equipo.normalizarSerie(e.serie()), 60);
            String modelo = corto(limpio(e.modelo()), 120), ubicacion = corto(limpio(e.ubicacion()), 120);
            String motivo = corto(limpio(e.motivo()), 120);
            if (motivo == null) motivo = motivoPedido;
            if (serie == null && modelo == null && ubicacion == null && motivo == null) continue;
            if (serie != null && !vistas.add(serie)) throw new BusinessException("El N/S " + serie + " está dos veces");
            if (motivo == null) throw new BusinessException("Elegí qué le pasa a " + (serie != null ? "N/S " + serie : "cada equipo"));
            if (out.size() >= 30) throw new BusinessException("Hasta 30 equipos por pedido");
            Map<String, String> m = new LinkedHashMap<>();
            m.put("serie", serie);
            m.put("modelo", modelo);
            m.put("ubicacion", ubicacion);
            m.put("motivo", motivo);
            out.add(m);
        }
        return out.isEmpty() ? null : out;
    }

    // Solo días y franjas conocidos, sin repetir y siempre en el mismo orden
    private static List<Map<String, String>> ventanasValidas(List<PedidoEmpresaCreateDTO.Ventana> lista) {
        if (lista == null) return null;
        TreeMap<Integer, Map<String, String>> orden = new TreeMap<>();
        for (var v : lista) {
            if (v == null) continue;
            int d = DIAS.indexOf(v.dia()), f = FRANJAS.indexOf(v.franja());
            if (d < 0 || f < 0) throw new BusinessException("Día u horario inválido");
            Map<String, String> m = new LinkedHashMap<>();
            m.put("dia", v.dia());
            m.put("franja", v.franja());
            orden.put(d * 10 + f, m);
        }
        return orden.isEmpty() ? null : new ArrayList<>(orden.values());
    }

    // "Lun mañana y tarde · Mié tarde" (o "cualquier día y horario")
    public static String ventanasTexto(List<Map<String, String>> ventanas) {
        if (ventanas.size() == DIAS.size() * FRANJAS.size()) return "cualquier día y horario";
        List<String> partes = new ArrayList<>();
        for (int d = 0; d < DIAS.size(); d++) {
            List<String> fr = new ArrayList<>();
            for (int f = 0; f < FRANJAS.size(); f++)
                for (Map<String, String> v : ventanas)
                    if (DIAS.get(d).equals(v.get("dia")) && FRANJAS.get(f).equals(v.get("franja"))) fr.add(FRANJAS_CORTO.get(f));
            if (fr.isEmpty()) continue;
            partes.add(DIAS_CORTO.get(d) + " " + (fr.size() == FRANJAS.size() ? "todo el día"
                : fr.size() == 1 ? fr.get(0) : String.join(", ", fr.subList(0, fr.size() - 1)) + " y " + fr.get(fr.size() - 1)));
        }
        return String.join(" · ", partes);
    }

    // "\n• N/S 123 · Piso 2 — No enfría"
    private static String equiposTexto(List<Map<String, String>> equipos) {
        StringBuilder sb = new StringBuilder();
        for (Map<String, String> e : equipos)
            sb.append("\n• ").append(e.get("serie") != null ? "N/S " + e.get("serie") : "Sin N/S")
              .append(e.get("modelo") != null ? " · " + e.get("modelo") : "")
              .append(e.get("ubicacion") != null ? " · " + e.get("ubicacion") : "")
              .append(e.get("motivo") != null ? " — " + e.get("motivo") : "");
        return sb.toString();
    }

    // Primer día desde mañana que les sirve (domingo nunca)
    public static LocalDate proximaFecha(List<Map<String, String>> ventanas) {
        Set<String> dias = new HashSet<>();
        for (Map<String, String> v : ventanas) dias.add(v.get("dia"));
        LocalDate d = LocalDate.now();
        for (int i = 0; i < 14; i++) {
            d = d.plusDays(1);
            int idx = d.getDayOfWeek().getValue() - 1; // lunes = 0
            if (idx < DIAS.size() && dias.contains(DIAS.get(idx))) return d;
        }
        return null;
    }

    private static String aJson(List<Map<String, String>> lista) {
        if (lista == null || lista.isEmpty()) return null;
        try { return JSON.writeValueAsString(lista); } catch (Exception e) { return null; }
    }

    public static List<Map<String, String>> leerLista(String json) {
        if (json == null || json.isBlank()) return List.of();
        try { return JSON.readValue(json, new TypeReference<List<Map<String, String>>>() {}); }
        catch (Exception e) { return List.of(); }
    }
}
