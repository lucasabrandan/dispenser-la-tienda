package com.dispenserlatienda.service.notificacion;

import com.dispenserlatienda.domain.notificacion.Notificacion;
import com.dispenserlatienda.domain.notificacion.TipoNotificacion;
import com.dispenserlatienda.domain.usuario.Usuario;
import com.dispenserlatienda.dto.notificacion.NotificacionDTO;
import com.dispenserlatienda.repository.notificacion.NotificacionRepository;
import com.dispenserlatienda.repository.usuario.UsuarioRepository;
import com.dispenserlatienda.service.common.WhatsAppService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class NotificacionService {

    private static final Logger log = LoggerFactory.getLogger(NotificacionService.class);

    private final NotificacionRepository repo;
    private final UsuarioRepository usuarioRepo;
    private final WhatsAppService whatsApp;

    public NotificacionService(NotificacionRepository repo, UsuarioRepository usuarioRepo, WhatsAppService whatsApp) {
        this.repo = repo;
        this.usuarioRepo = usuarioRepo;
        this.whatsApp = whatsApp;
    }

    // ── Crear notificacion + WhatsApp ────────────────────────────────────────

    @Transactional
    public void notificar(TipoNotificacion tipo, Long destinoId, Long origenId,
                          String titulo, String mensaje, Long referenciaId, boolean enviarWhatsApp) {
        Usuario destino = usuarioRepo.findById(destinoId).orElse(null);
        if (destino == null) return;
        Usuario origen = origenId != null ? usuarioRepo.findById(origenId).orElse(null) : null;

        Notificacion n = new Notificacion();
        n.setTipo(tipo);
        n.setTitulo(titulo);
        n.setMensaje(mensaje);
        n.setDestino(destino);
        n.setOrigen(origen);
        n.setReferenciaId(referenciaId);
        repo.save(n);

        if (enviarWhatsApp) {
            String wpp = destino.getWhatsapp() != null ? destino.getWhatsapp() : destino.getTelefono();
            if (wpp != null && !wpp.isBlank()) {
                String wppMsg = construirMensajeWhatsApp(tipo, titulo, mensaje, origen);
                whatsApp.enviar(wpp, wppMsg);
            }
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
        };
    }

    // ── Queries ──────────────────────────────────────────────────────────────

    public List<NotificacionDTO> listar(Long usuarioId) {
        return repo.findTop50ByDestinoIdOrderByCreadoEnDesc(usuarioId)
            .stream().map(this::toDTO).collect(Collectors.toList());
    }

    public long contarNoLeidas(Long usuarioId) {
        return repo.countByDestinoIdAndLeidaFalse(usuarioId);
    }

    @Transactional
    public void marcarLeida(Long id) {
        repo.findById(id).ifPresent(n -> { n.setLeida(true); repo.save(n); });
    }

    @Transactional
    public int marcarTodasLeidas(Long usuarioId) {
        return repo.marcarTodasLeidas(usuarioId);
    }

    private NotificacionDTO toDTO(Notificacion n) {
        return new NotificacionDTO(
            n.getId(),
            n.getTipo().name(),
            n.getTitulo(),
            n.getMensaje(),
            n.getOrigen() != null ? n.getOrigen().getNombre() : null,
            n.getReferenciaId(),
            n.isLeida(),
            n.getCreadoEn()
        );
    }
}
