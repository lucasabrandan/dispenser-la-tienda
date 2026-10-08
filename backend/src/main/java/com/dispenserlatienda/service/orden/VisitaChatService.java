package com.dispenserlatienda.service.orden;

import com.dispenserlatienda.domain.notificacion.TipoNotificacion;
import com.dispenserlatienda.domain.orden.OrdenVisita;
import com.dispenserlatienda.domain.orden.VisitaMensaje;
import com.dispenserlatienda.domain.usuario.RolUsuario;
import com.dispenserlatienda.domain.usuario.Usuario;
import com.dispenserlatienda.exception.BusinessException;
import com.dispenserlatienda.exception.ResourceNotFoundException;
import com.dispenserlatienda.repository.orden.OrdenVisitaRepository;
import com.dispenserlatienda.repository.orden.VisitaMensajeRepository;
import com.dispenserlatienda.repository.usuario.UsuarioRepository;
import com.dispenserlatienda.service.notificacion.NotificacionService;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

// Conversación admin ↔ técnico de una visita (8-oct-2026), como la de los pedidos de
// empresa: cada mensaje queda guardado con fecha y hora y le llega como aviso al otro.
@Service
public class VisitaChatService {

    private final VisitaMensajeRepository repo;
    private final OrdenVisitaRepository ordenRepo;
    private final UsuarioRepository usuarioRepo;
    private final NotificacionService notificaciones;

    public VisitaChatService(VisitaMensajeRepository repo, OrdenVisitaRepository ordenRepo,
                             UsuarioRepository usuarioRepo, NotificacionService notificaciones) {
        this.repo = repo;
        this.ordenRepo = ordenRepo;
        this.usuarioRepo = usuarioRepo;
        this.notificaciones = notificaciones;
    }

    // Admin: cualquiera. Técnico: solo las visitas que son suyas.
    private OrdenVisita visitaPermitida(Usuario quien, Long ordenId) {
        OrdenVisita o = ordenRepo.findById(ordenId)
            .orElseThrow(() -> new ResourceNotFoundException("Visita no encontrada"));
        if (quien.getRol() == RolUsuario.ADMIN) return o;
        if (quien.getRol() == RolUsuario.TECNICO && o.getTecnico() != null && o.getTecnico().getId().equals(quien.getId())) return o;
        throw new AccessDeniedException("Esa visita no es tuya");
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> listar(Usuario quien, Long ordenId) {
        visitaPermitida(quien, ordenId);
        return repo.findByOrdenIdOrderByIdAsc(ordenId).stream().map(VisitaChatService::aMapa).toList();
    }

    @Transactional
    public Map<String, Object> enviar(Usuario quien, Long ordenId, String texto) {
        OrdenVisita o = visitaPermitida(quien, ordenId);
        String t = texto == null ? "" : texto.trim();
        if (t.isEmpty()) throw new BusinessException("MENSAJE_VACIO", "Escribí el mensaje");
        if (t.length() > 2000) t = t.substring(0, 2000);
        boolean deAdmin = quien.getRol() == RolUsuario.ADMIN;
        VisitaMensaje m = new VisitaMensaje();
        m.setOrdenId(o.getId());
        m.setAutorId(quien.getId());
        m.setAutorNombre(quien.getNombre());
        m.setDeAdmin(deAdmin);
        m.setTexto(t);
        m = repo.save(m);

        String cliente = o.getClienteNombre() != null && !o.getClienteNombre().isBlank() ? o.getClienteNombre() : o.getTitulo();
        String resumen = t.length() > 180 ? t.substring(0, 180) + "…" : t;
        if (deAdmin) {
            if (o.getTecnico() != null && !o.getTecnico().getId().equals(quien.getId())) {
                notificaciones.notificar(TipoNotificacion.MENSAJE_LIBRE, o.getTecnico().getId(), quien.getId(),
                    "💬 Mensaje del admin · " + cliente, resumen, o.getId(), false);
            }
        } else {
            usuarioRepo.findAll().stream()
                .filter(u -> u.getRol() == RolUsuario.ADMIN && u.isActivo())
                .forEach(a -> notificaciones.notificar(TipoNotificacion.MENSAJE_LIBRE, a.getId(), quien.getId(),
                    "💬 " + quien.getNombre().split(" ")[0] + " · " + cliente, resumen, o.getId(), false));
        }
        return aMapa(m);
    }

    // Aviso automático en el historial (no notifica: el evento ya avisa por su cuenta)
    public void registrar(Long ordenId, Usuario autor, boolean deAdmin, String texto) {
        if (ordenId == null || texto == null || texto.isBlank()) return;
        try {
            VisitaMensaje m = new VisitaMensaje();
            m.setOrdenId(ordenId);
            if (autor != null) { m.setAutorId(autor.getId()); m.setAutorNombre(autor.getNombre()); }
            m.setDeAdmin(deAdmin);
            m.setSistema(true);
            m.setTexto(texto.length() > 2000 ? texto.substring(0, 2000) : texto);
            repo.save(m);
        } catch (Exception e) {
            // el historial nunca frena la operación principal
        }
    }

    private static Map<String, Object> aMapa(VisitaMensaje m) {
        Map<String, Object> x = new LinkedHashMap<>();
        x.put("id", m.getId());
        x.put("autorId", m.getAutorId());
        x.put("autorNombre", m.getAutorNombre());
        x.put("deAdmin", m.isDeAdmin());
        x.put("sistema", m.isSistema());
        x.put("texto", m.getTexto());
        x.put("creadoEn", m.getCreadoEn());
        return x;
    }
}
