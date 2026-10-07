package com.dispenserlatienda.service.notificacion;

import com.dispenserlatienda.domain.notificacion.Notificacion;
import com.dispenserlatienda.domain.notificacion.TipoNotificacion;
import com.dispenserlatienda.domain.usuario.Usuario;
import com.dispenserlatienda.dto.notificacion.NotificacionDTO;
import com.dispenserlatienda.repository.notificacion.NotificacionRepository;
import com.dispenserlatienda.repository.orden.OrdenVisitaRepository;
import com.dispenserlatienda.repository.servicio.ServicioRepository;
import com.dispenserlatienda.domain.orden.OrdenVisita;
import com.dispenserlatienda.domain.servicio.Servicio;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import com.dispenserlatienda.repository.usuario.UsuarioRepository;
import com.dispenserlatienda.service.common.WhatsAppService;
import com.dispenserlatienda.service.push.WebPushService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class NotificacionService {

    private static final Logger log = LoggerFactory.getLogger(NotificacionService.class);

    private final NotificacionRepository repo;
    private final UsuarioRepository usuarioRepo;
    private final WhatsAppService whatsApp;
    private final WebPushService webPush;
    // La notificación se guarda en su PROPIA transacción: si falla (ej. la base
    // rechaza un tipo nuevo por un CHECK viejo, como pasó con TRABAJO_ASIGNADO el
    // 1-sep), no tiene que tirar abajo la operación principal (guardar un
    // presupuesto, crear una orden). Antes el error de la notificación hacía
    // rollback de todo.
    private final TransactionTemplate txAparte;
    private final OrdenVisitaRepository ordenRepo;
    private final ServicioRepository servicioRepo;

    public NotificacionService(NotificacionRepository repo, UsuarioRepository usuarioRepo,
                                WhatsAppService whatsApp, WebPushService webPush,
                                PlatformTransactionManager txManager,
                                OrdenVisitaRepository ordenRepo, ServicioRepository servicioRepo) {
        this.repo = repo;
        this.ordenRepo = ordenRepo;
        this.servicioRepo = servicioRepo;
        this.usuarioRepo = usuarioRepo;
        this.whatsApp = whatsApp;
        this.webPush = webPush;
        this.txAparte = new TransactionTemplate(txManager);
        this.txAparte.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
    }

    // ── Crear notificacion + WhatsApp ────────────────────────────────────────

    public void notificar(TipoNotificacion tipo, Long destinoId, Long origenId,
                          String titulo, String mensaje, Long referenciaId, boolean enviarWhatsApp) {
        Usuario destino = usuarioRepo.findById(destinoId).orElse(null);
        if (destino == null) return;
        Usuario origen = origenId != null ? usuarioRepo.findById(origenId).orElse(null) : null;

        // 7-oct-2026: todo (guardar, push y WhatsApp) sale DESPUÉS de que se guarde la
        // operación principal. Antes: (1) el push salía en el medio y el celular, al
        // pedir los datos de la visita, la encontraba sin guardar o con el día viejo;
        // (2) si la operación fallaba (error 500), la notificación quedaba igual
        // guardada y después aparecían avisos de cambios que nunca pasaron.
        Runnable enviar = () -> {
            try {
                txAparte.executeWithoutResult(status -> {
                    Notificacion n = new Notificacion();
                    n.setTipo(tipo);
                    n.setTitulo(titulo);
                    n.setMensaje(mensaje);
                    n.setDestino(usuarioRepo.getReferenceById(destino.getId()));
                    n.setOrigen(origen != null ? usuarioRepo.getReferenceById(origen.getId()) : null);
                    n.setReferenciaId(referenciaId);
                    repo.save(n);
                });
            } catch (Exception e) {
                log.warn("No se pudo guardar la notificación {} para usuario {}: {}", tipo, destinoId, e.getMessage());
            }
            webPush.enviarATodosLosDispositivos(destino);
            if (enviarWhatsApp) {
                String wpp = destino.getWhatsapp() != null ? destino.getWhatsapp() : destino.getTelefono();
                if (wpp != null && !wpp.isBlank()) {
                    String wppMsg = construirMensajeWhatsApp(tipo, titulo, mensaje, origen);
                    whatsApp.enviar(wpp, wppMsg);
                }
            }
        };
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override public void afterCommit() {
                    try { enviar.run(); } catch (Exception e) { log.warn("Notificación {}: {}", tipo, e.getMessage()); }
                }
            });
        } else {
            enviar.run();
        }
    }

    // ── Mensajes WhatsApp con formato llamativo ──────────────────────────────

    private String construirMensajeWhatsApp(TipoNotificacion tipo, String titulo, String detalle, Usuario origen) {
        String from = origen != null ? origen.getNombre() : "Sistema";
        return switch (tipo) {
            case ORDEN_ASIGNADA -> String.format(
                "\uD83D\uDCCB *NUEVA ORDEN ASIGNADA*\n\n" +
                "\uD83D\uDC64 Asignada por: %s\n" +
                "\uD83D\uDD27 %s\n\n" +
                "%s\n\n" +
                "\u2705 Revisala en la app para mas detalles.", from, titulo, detalle != null ? detalle : "");
            case ORDEN_COMPLETADA -> String.format(
                "\u2705 *TRABAJO COMPLETADO*\n\n" +
                "\uD83D\uDC64 Tecnico: %s\n" +
                "\uD83D\uDD27 %s\n\n" +
                "%s\n\n" +
                "\uD83D\uDCCA Revisalo en la app.", from, titulo, detalle != null ? detalle : "");
            case ORDEN_NO_ATENDIDO -> String.format(
                "\u26A0\uFE0F *NO ATENDIDO*\n\n" +
                "\uD83D\uDC64 Tecnico: %s\n" +
                "\uD83D\uDD27 %s\n\n" +
                "%s\n\n" +
                "\uD83D\uDD04 Requiere reprogramar.", from, titulo, detalle != null ? detalle : "");
            case ORDEN_EN_CAMINO -> String.format(
                "\uD83D\uDE97 *EN CAMINO*\n\n" +
                "\uD83D\uDC64 %s salio hacia el trabajo.\n" +
                "\uD83D\uDD27 %s", from, titulo);
            case ORDEN_EN_SITIO -> String.format(
                "\uD83D\uDCCD *LLEGO AL SITIO*\n\n" +
                "\uD83D\uDC64 %s esta en el lugar.\n" +
                "\uD83D\uDD27 %s", from, titulo);
            case PRESUPUESTO_EJECUTADO -> String.format(
                "\uD83D\uDE80 *PRESUPUESTO EJECUTADO*\n\n" +
                "\uD83D\uDC64 Por: %s\n" +
                "\uD83D\uDCCB %s\n\n" +
                "%s", from, titulo, detalle != null ? detalle : "");
            case COBRO_REGISTRADO -> String.format(
                "\uD83D\uDCB0 *COBRO REGISTRADO*\n\n" +
                "\uD83D\uDCCB %s\n\n" +
                "%s\n\n" +
                "\u2705 Todo al dia!", titulo, detalle != null ? detalle : "");
            case MENSAJE_LIBRE -> String.format(
                "\uD83D\uDCE9 *MENSAJE DE %s*\n\n%s", from.toUpperCase(), detalle != null ? detalle : titulo);
            case TRABAJO_ASIGNADO -> String.format(
                "\uD83D\uDD27 *NUEVO TRABAJO ASIGNADO*\n\n" +
                "\uD83D\uDC64 Asignado por: %s\n" +
                "\uD83D\uDCCB %s\n\n" +
                "%s\n\n" +
                "\u2705 Revisalo en la app.", from, titulo, detalle != null ? detalle : "");
        };
    }

    // ── Queries ──────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<NotificacionDTO> listar(Long usuarioId) {
        List<Notificacion> lista = repo.findTop50ByDestinoIdOrderByCreadoEnDesc(usuarioId);
        // Datos de la tarjeta: una sola consulta para las visitas y otra para los trabajos
        java.util.Set<Long> idsOrden = new java.util.HashSet<>();
        java.util.Set<Long> idsServicio = new java.util.HashSet<>();
        for (Notificacion n : lista) {
            if (n.getReferenciaId() == null) continue;
            if (n.getTipo() == TipoNotificacion.TRABAJO_ASIGNADO) idsServicio.add(n.getReferenciaId());
            else idsOrden.add(n.getReferenciaId());
        }
        java.util.Map<Long, OrdenVisita> ordenes = new java.util.HashMap<>();
        java.util.Map<Long, Servicio> servicios = new java.util.HashMap<>();
        try {
            if (!idsOrden.isEmpty()) ordenRepo.findAllById(idsOrden).forEach(o -> ordenes.put(o.getId(), o));
            if (!idsServicio.isEmpty()) servicioRepo.findAllById(idsServicio).forEach(sv -> servicios.put(sv.getId(), sv));
        } catch (Exception e) {
            log.warn("Notificaciones: no se pudieron cargar las tarjetas: {}", e.getMessage());
        }
        return lista.stream().map(n -> toDTO(n, ordenes, servicios)).collect(Collectors.toList());
    }

    public long contarNoLeidas(Long usuarioId) {
        return repo.countByDestinoIdAndLeidaFalse(usuarioId);
    }

    // Historial de un trabajo (Servicio), para la pantalla de línea de tiempo
    // del admin: se arma leyendo las notificaciones TRABAJO_ASIGNADO ya
    // guardadas para ese servicio (asignación inicial, reasignaciones,
    // horario confirmado por el técnico), sin agregar ningún registro nuevo.
    // Cuando hay más de un admin activo, "horario confirmado" genera una fila
    // por cada uno con el mismo contenido — acá interesa el evento, no cuántos
    // admins lo recibieron, así que se deduplica por fecha+título+mensaje.
    public List<NotificacionDTO> historialDeTrabajo(Long servicioId) {
        List<Notificacion> eventos = repo.findByReferenciaIdAndTipoOrderByCreadoEnAsc(
                servicioId, com.dispenserlatienda.domain.notificacion.TipoNotificacion.TRABAJO_ASIGNADO);
        java.util.LinkedHashMap<String, Notificacion> unicos = new java.util.LinkedHashMap<>();
        for (Notificacion n : eventos) {
            String key = n.getCreadoEn() + "|" + n.getTitulo() + "|" + n.getMensaje();
            unicos.putIfAbsent(key, n);
        }
        return unicos.values().stream().map(n -> toDTO(n, java.util.Map.of(), java.util.Map.of())).collect(Collectors.toList());
    }

    @Transactional
    public void marcarLeida(Long id) {
        repo.findById(id).ifPresent(n -> { n.setLeida(true); repo.save(n); });
    }

    // Solo el destinatario marca como leída su notificación (4-oct-2026)
    @Transactional
    public void marcarLeida(Long id, Long usuarioId) {
        repo.findById(id)
            .filter(n -> n.getDestino() != null && n.getDestino().getId().equals(usuarioId))
            .ifPresent(n -> { n.setLeida(true); repo.save(n); });
    }

    @Transactional
    public int marcarTodasLeidas(Long usuarioId) {
        return repo.marcarTodasLeidas(usuarioId);
    }

    private NotificacionDTO toDTO(Notificacion n, java.util.Map<Long, OrdenVisita> ordenes, java.util.Map<Long, Servicio> servicios) {
        Long ordenId = null; String cliente = null, hora = null, tecnico = null, direccion = null;
        java.time.LocalDate fecha = null;
        Long ref = n.getReferenciaId();
        if (ref != null && n.getTipo() == TipoNotificacion.TRABAJO_ASIGNADO) {
            Servicio sv = servicios.get(ref);
            if (sv != null) {
                cliente = sv.getClienteNombre();
                fecha = sv.getFechaServicio();
                hora = sv.getHoraServicio();
                tecnico = sv.getUsuario() != null ? sv.getUsuario().getNombre() : null;
                if (sv.getSede() != null) {
                    String d = String.join(" ", java.util.stream.Stream.of(sv.getSede().getCalle(), sv.getSede().getNumero())
                        .filter(x -> x != null && !x.isBlank()).toList());
                    String loc = sv.getSede().getLocalidad();
                    direccion = d.isBlank() ? loc : (loc != null && !loc.isBlank() ? d + ", " + loc : d);
                }
            }
        } else if (ref != null) {
            OrdenVisita o = ordenes.get(ref);
            if (o != null) {
                ordenId = o.getId();
                cliente = o.getClienteNombre();
                fecha = o.getFechaProgramada();
                hora = o.getHoraEstimada();
                tecnico = o.getTecnico() != null ? o.getTecnico().getNombre() : null;
                direccion = o.getDireccion();
            }
        }
        return new NotificacionDTO(
            n.getId(),
            n.getTipo().name(),
            n.getTitulo(),
            n.getMensaje(),
            n.getOrigen() != null ? n.getOrigen().getNombre() : null,
            n.getReferenciaId(),
            n.isLeida(),
            n.getCreadoEn(),
            ordenId, cliente, fecha, hora, tecnico, direccion
        );
    }
}
