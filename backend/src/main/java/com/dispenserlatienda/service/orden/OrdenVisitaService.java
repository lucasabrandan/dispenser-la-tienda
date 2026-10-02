package com.dispenserlatienda.service.orden;

import com.dispenserlatienda.domain.orden.EstadoOrden;
import com.dispenserlatienda.domain.orden.OrdenVisita;
import com.dispenserlatienda.domain.orden.PrioridadOrden;
import com.dispenserlatienda.domain.sede.Sede;
import com.dispenserlatienda.domain.servicio.EstadoServicio;
import com.dispenserlatienda.domain.servicio.MetodoPago;
import com.dispenserlatienda.domain.servicio.Servicio;
import com.dispenserlatienda.domain.servicio.ServicioItem;
import com.dispenserlatienda.domain.servicio.ServicioTipo;
import com.dispenserlatienda.domain.usuario.RolUsuario;
import com.dispenserlatienda.domain.usuario.Usuario;
import com.dispenserlatienda.dto.orden.OrdenAvanceDTO;
import com.dispenserlatienda.dto.orden.OrdenVisitaCreateDTO;
import com.dispenserlatienda.dto.orden.OrdenVisitaDTO;
import com.dispenserlatienda.repository.orden.OrdenVisitaRepository;
import com.dispenserlatienda.repository.sede.SedeRepository;
import com.dispenserlatienda.repository.servicio.ServicioRepository;
import com.dispenserlatienda.repository.usuario.UsuarioRepository;
import com.dispenserlatienda.domain.notificacion.TipoNotificacion;
import com.dispenserlatienda.service.common.WhatsAppService;
import com.dispenserlatienda.service.notificacion.NotificacionService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class OrdenVisitaService {

    private final OrdenVisitaRepository repo;
    private final UsuarioRepository     usuarioRepo;
    private final WhatsAppService       whatsApp;
    private final NotificacionService   notificacionService;
    private final ServicioRepository    servicioRepository;
    private final SedeRepository        sedeRepository;

    public OrdenVisitaService(OrdenVisitaRepository repo,
                              UsuarioRepository usuarioRepo,
                              WhatsAppService whatsApp,
                              NotificacionService notificacionService,
                              ServicioRepository servicioRepository,
                              SedeRepository sedeRepository) {
        this.repo              = repo;
        this.usuarioRepo       = usuarioRepo;
        this.whatsApp          = whatsApp;
        this.notificacionService = notificacionService;
        this.servicioRepository = servicioRepository;
        this.sedeRepository    = sedeRepository;
    }

    // ── Admin: crear orden ─────────────────────────────────────────────────────
    @Transactional
    public OrdenVisitaDTO crear(OrdenVisitaCreateDTO dto) {
        Usuario tecnico = usuarioRepo.findById(dto.tecnicoId())
            .orElseThrow(() -> new IllegalArgumentException("Técnico no encontrado: " + dto.tecnicoId()));

        // Un presupuesto no puede tener dos órdenes vivas a la vez (antes pasaba: se
        // despachaba desde el asistente y después se volvía a despachar desde Presupuestos).
        if (dto.presupuestoId() != null && repo.existsByPresupuestoIdAndEstadoNotIn(
                dto.presupuestoId(), List.of(EstadoOrden.CANCELADA, EstadoOrden.NO_ATENDIDO))) {
            throw new IllegalArgumentException("Ese presupuesto ya tiene una orden asignada");
        }

        OrdenVisita o = new OrdenVisita();
        o.setTecnico(tecnico);
        o.setTitulo(dto.titulo().trim());
        o.setDescripcion(dto.descripcion());
        o.setDireccion(dto.direccion());
        o.setClienteId(dto.clienteId());
        o.setClienteNombre(dto.clienteNombre());
        o.setClienteTelefono(dto.clienteTelefono());
        o.setPrioridad(dto.prioridad() != null ? PrioridadOrden.valueOf(dto.prioridad()) : PrioridadOrden.NORMAL);
        o.setFechaProgramada(dto.fechaProgramada());
        o.setHoraEstimada(dto.horaEstimada());
        o.setMontoEstimado(dto.montoEstimado());
        o.setFormaPago(dto.formaPago());
        o.setPresupuestoId(dto.presupuestoId());

        OrdenVisitaDTO saved = toDTO(repo.save(o));

        // El presupuesto pasa a "trabajo a realizar" (EN_PROGRESO) apenas tiene orden,
        // venga de donde venga (asistente, Presupuestos u Órdenes). Antes solo lo hacía
        // el modal de Presupuestos, y el del asistente lo dejaba como presupuesto suelto.
        if (dto.presupuestoId() != null) {
            servicioRepository.findById(dto.presupuestoId()).ifPresent(s -> {
                if (s.getEstado() == EstadoServicio.PRESUPUESTO) {
                    s.setEstado(EstadoServicio.EN_PROGRESO);
                }
                s.setEnEspera(false); // despacharlo = retomarlo
                servicioRepository.save(s);
            });
        }
        notificarTecnico(tecnico, saved);
        // Notificacion in-app al tecnico
        notificacionService.notificar(
            TipoNotificacion.ORDEN_ASIGNADA, tecnico.getId(), null,
            saved.titulo(),
            (saved.clienteNombre() != null ? saved.clienteNombre() : "") +
            (saved.fechaProgramada() != null ? " · " + saved.fechaProgramada().format(DateTimeFormatter.ofPattern("dd/MM")) : ""),
            saved.id(), false); // el WhatsApp ya lo manda notificarTecnico(), con más detalle
        return saved;
    }

    // ── Admin: editar orden ────────────────────────────────────────────────────
    @Transactional
    public OrdenVisitaDTO actualizar(Long id, OrdenVisitaCreateDTO dto) {
        OrdenVisita o = repo.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("Orden no encontrada: " + id));

        Usuario tecnico = usuarioRepo.findById(dto.tecnicoId())
            .orElseThrow(() -> new IllegalArgumentException("Técnico no encontrado: " + dto.tecnicoId()));

        boolean cambioTecnico = o.getTecnico() != null && !o.getTecnico().getId().equals(tecnico.getId());
        o.setTecnico(tecnico);
        o.setTitulo(dto.titulo().trim());
        o.setDescripcion(dto.descripcion());
        o.setDireccion(dto.direccion());
        o.setClienteId(dto.clienteId());
        o.setClienteNombre(dto.clienteNombre());
        o.setClienteTelefono(dto.clienteTelefono());
        o.setPrioridad(dto.prioridad() != null ? PrioridadOrden.valueOf(dto.prioridad()) : PrioridadOrden.NORMAL);
        o.setFechaProgramada(dto.fechaProgramada());
        o.setHoraEstimada(dto.horaEstimada());
        o.setMontoEstimado(dto.montoEstimado());
        o.setFormaPago(dto.formaPago());
        o.setPresupuestoId(dto.presupuestoId());

        // Si estaba NO_ATENDIDO, reprogramar la vuelve a PENDIENTE
        if (o.getEstado() == EstadoOrden.NO_ATENDIDO) {
            o.setEstado(EstadoOrden.PENDIENTE);
            o.setFechaCompletada(null);
        }

        OrdenVisitaDTO guardada = toDTO(repo.save(o));
        if (cambioTecnico) {
            notificarTecnico(tecnico, guardada);
            notificacionService.notificar(TipoNotificacion.ORDEN_ASIGNADA, tecnico.getId(), null,
                guardada.titulo(), guardada.clienteNombre() != null ? guardada.clienteNombre() : "",
                guardada.id(), false);
        }
        return guardada;
    }

    // ── Admin: eliminar ────────────────────────────────────────────────────────
    @Transactional
    public void eliminar(Long id) {
        repo.deleteById(id);
    }

    // ── Admin: listar todas (con filtro de rango de fechas) ───────────────────
    public List<OrdenVisitaDTO> listarTodas(LocalDate desde, LocalDate hasta) {
        LocalDate d = desde != null ? desde : LocalDate.now().minusDays(7);
        LocalDate h = hasta != null ? hasta : LocalDate.now().plusDays(30);
        return repo.findByFechaProgramadaBetweenOrderByTecnicoIdAscFechaProgramadaAsc(d, h)
            .stream().map(this::toDTO).collect(Collectors.toList());
    }

    // ── Técnico: listar mis órdenes activas ────────────────────────────────────
    public List<OrdenVisitaDTO> listarPorTecnico(Long tecnicoId) {
        List<EstadoOrden> excluidos = List.of(EstadoOrden.COMPLETADA, EstadoOrden.CANCELADA, EstadoOrden.NO_ATENDIDO);
        return repo.findActivasByTecnico(tecnicoId, excluidos)
            .stream().map(this::toDTO).collect(Collectors.toList());
    }

    // ── Técnico: listar todas (historial) ─────────────────────────────────────
    public List<OrdenVisitaDTO> listarHistorialTecnico(Long tecnicoId) {
        return repo.findByTecnicoIdOrderByFechaProgramadaAscHoraEstimadaAsc(tecnicoId)
            .stream().map(this::toDTO).collect(Collectors.toList());
    }

    // ── Técnico/Admin: avanzar estado ─────────────────────────────────────────
    @Transactional
    public OrdenVisitaDTO avanzarEstado(Long id, OrdenAvanceDTO dto) {
        OrdenVisita o = repo.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("Orden no encontrada: " + id));

        EstadoOrden nuevoEstado;
        try {
            nuevoEstado = EstadoOrden.valueOf(dto.estado());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Estado inválido: " + dto.estado());
        }

        EstadoOrden estadoAnterior = o.getEstado();
        boolean esRetroceso = esRetrocesoPermitido(estadoAnterior, nuevoEstado);
        if (estadoAnterior == EstadoOrden.COMPLETADA && nuevoEstado != EstadoOrden.COMPLETADA) {
            // Al completar ya se generó/actualizó el servicio: volver atrás acá lo dejaría colgado.
            throw new IllegalArgumentException("La orden ya está completada; corregila desde el admin");
        }

        o.setEstado(nuevoEstado);
        if (dto.notasTecnico() != null && !dto.notasTecnico().isBlank()) {
            o.setNotasTecnico(dto.notasTecnico());
        }
        if (nuevoEstado == EstadoOrden.COMPLETADA) {
            o.setFechaCompletada(LocalDateTime.now());
            sincronizarConServicios(o);
        }
        // NO_ATENDIDO: vuelve al admin para reprogramar, no genera servicio
        if (nuevoEstado == EstadoOrden.NO_ATENDIDO) {
            o.setFechaCompletada(null);
        }

        OrdenVisitaDTO resultado = toDTO(repo.save(o));
        // Notificar admins cuando un tecnico cambia estado
        if (esRetroceso) {
            notificarRetroceso(o, estadoAnterior, nuevoEstado);
        } else {
            notificarCambioEstado(o, nuevoEstado);
        }
        return resultado;
    }

    // "Deshacer" del técnico: solo un paso atrás (Salí → Pendiente, Llegué → En camino)
    private static boolean esRetrocesoPermitido(EstadoOrden desde, EstadoOrden hacia) {
        return (desde == EstadoOrden.EN_CAMINO && hacia == EstadoOrden.PENDIENTE)
            || (desde == EstadoOrden.EN_SITIO && hacia == EstadoOrden.EN_CAMINO);
    }

    // Se usa MENSAJE_LIBRE (y no un tipo nuevo) porque la columna del enum en la base
    // puede tener un CHECK con los valores viejos y ddl-auto=update no lo actualiza.
    private void notificarRetroceso(OrdenVisita o, EstadoOrden desde, EstadoOrden hacia) {
        Long tecnicoId = o.getTecnico().getId();
        String titulo = "Deshecho: " + (o.getTitulo() != null ? o.getTitulo() : "orden #" + o.getId());
        String detalle = o.getTecnico().getNombre() + " volvió la orden de "
            + desde.name().replace('_', ' ') + " a " + hacia.name().replace('_', ' ');
        usuarioRepo.findAll().stream()
            .filter(u -> u.getRol() == RolUsuario.ADMIN && u.isActivo())
            .forEach(admin -> notificacionService.notificar(TipoNotificacion.MENSAJE_LIBRE,
                admin.getId(), tecnicoId, titulo, detalle, o.getId(), false));
    }

    // Notifica a todos los admins sobre cambios de estado del tecnico
    private void notificarCambioEstado(OrdenVisita o, EstadoOrden estado) {
        TipoNotificacion tipo = switch (estado) {
            case EN_CAMINO    -> TipoNotificacion.ORDEN_EN_CAMINO;
            case EN_SITIO     -> TipoNotificacion.ORDEN_EN_SITIO;
            case COMPLETADA   -> TipoNotificacion.ORDEN_COMPLETADA;
            case NO_ATENDIDO  -> TipoNotificacion.ORDEN_NO_ATENDIDO;
            default           -> null;
        };
        if (tipo == null) return;

        Long tecnicoId = o.getTecnico().getId();
        String tecnicoNombre = o.getTecnico().getNombre();
        String detalle = o.getClienteNombre() != null ? o.getClienteNombre() : "";
        if (o.getNotasTecnico() != null && !o.getNotasTecnico().isBlank()) {
            detalle += " — " + o.getNotasTecnico();
        }

        // Enviar a todos los admins
        List<Usuario> admins = usuarioRepo.findAll().stream()
            .filter(u -> u.getRol() == RolUsuario.ADMIN && u.isActivo())
            .collect(Collectors.toList());
        for (Usuario admin : admins) {
            // WhatsApp solo cuando el admin tiene que hacer algo (cerrar/cobrar o
            // reprogramar). "Salió" y "Llegó" quedan en la app, sin WhatsApp.
            boolean requiereAccion = estado == EstadoOrden.COMPLETADA || estado == EstadoOrden.NO_ATENDIDO;
            notificacionService.notificar(tipo, admin.getId(), tecnicoId,
                o.getTitulo(), detalle, o.getId(), requiereAccion);
        }
    }

    // ── Cascade al completar una orden ────────────────────────────────────────
    private void sincronizarConServicios(OrdenVisita o) {
        if (o.getPresupuestoId() != null) {
            // Caso 1: orden vinculada a presupuesto → marcar REALIZADO y asignar técnico para rendimientos
            servicioRepository.findById(o.getPresupuestoId()).ifPresent(s -> {
                // Técnico terminó — ahora falta definir cobro.
                // OJO: no pisar el estado si el servicio ya avanzó más allá
                // de "trabajo terminado" (ya facturado/cobrado) — si no,
                // cerrar la visita técnica (p.ej. reabrir y volver a cerrar)
                // revertiría un cobro ya registrado a COMPLETADO.
                boolean yaAvanzado = s.getEstado() == EstadoServicio.COMPLETADO
                        || s.getEstado() == EstadoServicio.PENDIENTE_FACTURACION
                        || s.getEstado() == EstadoServicio.FACTURADO
                        || s.getEstado() == EstadoServicio.COBRADO
                        || s.getEstado() == EstadoServicio.REALIZADO
                        // Un presupuesto archivado/cancelado no se "revive" al cerrar la orden
                        || s.getEstado() == EstadoServicio.ARCHIVADO
                        || s.getEstado() == EstadoServicio.CANCELADO;
                if (!yaAvanzado) {
                    s.setEstado(EstadoServicio.COMPLETADO);
                    s.setFechaCompletado(java.time.LocalDateTime.now());
                }
                if (o.getTecnico() != null) {
                    s.setUsuario(o.getTecnico());
                }
                servicioRepository.save(s);
            });
        } else if (o.getTecnico() != null) {
            // Caso 2: orden sin presupuesto → crear servicio mínimo para impactar rendimientos
            // Si ya existe un servicio asociado (creado por ModalRegistrarTrabajo), no duplicar
            if (servicioRepository.existsByOrdenId(o.getId())) return;

            Sede sedeMostrador = sedeRepository.findAll().stream()
                .filter(s -> s.getNombreSede() != null
                          && s.getNombreSede().toLowerCase().contains("mostrador"))
                .findFirst()
                .orElseGet(() -> sedeRepository.findAll().stream().findFirst().orElse(null));

            if (sedeMostrador == null) return; // no hay sedes, no se puede registrar

            Servicio servicio = new Servicio(
                sedeMostrador,
                o.getTecnico(),
                o.getFechaProgramada() != null ? o.getFechaProgramada() : LocalDate.now(),
                ServicioTipo.TECNICA
            );
            servicio.setEstado(EstadoServicio.COMPLETADO);
            servicio.setFechaCompletado(java.time.LocalDateTime.now());
            servicio.setClienteNombre(o.getClienteNombre() != null ? o.getClienteNombre() : "Particular");
            servicio.setSedeNombre(sedeMostrador.getNombreSede());
            servicio.setOrdenId(o.getId());
            servicio.setObservaciones(o.getDescripcion());
            servicio.setDescuentoPorcentaje(BigDecimal.ZERO);
            servicio.setCreadoEn(LocalDateTime.now());

            ServicioItem item = new ServicioItem();
            item.setTecnico(o.getTecnico().getNombre());
            item.setCosto(o.getMontoEstimado() != null ? o.getMontoEstimado() : BigDecimal.ZERO);
            item.setCostoExtra(BigDecimal.ZERO);
            item.setMetodoPago(o.getFormaPago() != null && o.getFormaPago().equals("TRANSFERENCIA")
                ? MetodoPago.TRANSFERENCIA : MetodoPago.EFECTIVO);
            item.setTrabajoRealizado(o.getTitulo());
            servicio.addItem(item);

            servicioRepository.save(servicio);
        }
    }

    // ── Resumen para badge sidebar ─────────────────────────────────────────────
    public long countActivas() {
        return repo.countTodasActivas();
    }

    public long countActivasTecnico(Long tecnicoId) {
        return repo.countActivasByTecnico(tecnicoId);
    }

    // ── Técnicos disponibles ──────────────────────────────────────────────────
    public List<Usuario> listarTecnicos() {
        return usuarioRepo.findAll().stream()
            .filter(u -> u.getRol() == RolUsuario.TECNICO || u.getRol() == RolUsuario.ADMIN)
            .collect(Collectors.toList());
    }

    // ── Notificación WhatsApp ─────────────────────────────────────────────────
    private void notificarTecnico(Usuario tecnico, OrdenVisitaDTO o) {
        String numero = tecnico.getWhatsapp() != null && !tecnico.getWhatsapp().isBlank()
                ? tecnico.getWhatsapp()
                : tecnico.getTelefono();

        if (numero == null || numero.isBlank()) return;

        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("dd/MM/yyyy");
        String fecha = o.fechaProgramada() != null ? o.fechaProgramada().format(fmt) : "—";
        String hora  = o.horaEstimada()    != null ? o.horaEstimada() : "";

        String prioridad = switch (o.prioridad()) {
            case "URGENTE" -> "🚨 URGENTE";
            case "ALTA"    -> "⚠️ Alta";
            default        -> "Normal";
        };

        String monto = o.montoEstimado() != null
                ? "💰 $" + String.format("%,.0f", o.montoEstimado().doubleValue())
                : "";

        String mensaje = String.join("\n",
            "🔧 *Nueva orden de trabajo*",
            "",
            "📋 " + o.titulo(),
            "👤 " + o.clienteNombre(),
            "📅 " + fecha + (hora.isBlank() ? "" : "  🕐 " + hora),
            "⚡ Prioridad: " + prioridad,
            monto.isBlank() ? "" : monto,
            o.direccion() != null && !o.direccion().isBlank() ? "📍 " + o.direccion() : "",
            "",
            "Ingresá a la app para ver el detalle."
        ).stripTrailing().replaceAll("\n{3,}", "\n\n");

        whatsApp.enviar(numero, mensaje);
    }

    // ── Mapper ─────────────────────────────────────────────────────────────────
    private OrdenVisitaDTO toDTO(OrdenVisita o) {
        Servicio tentativo = presupuestoTentativo(o);
        return new OrdenVisitaDTO(
            o.getId(),
            o.getTecnico().getId(),
            o.getTecnico().getNombre(),
            o.getTitulo(),
            o.getDescripcion(),
            o.getDireccion(),
            o.getClienteId(),
            o.getClienteNombre(),
            o.getClienteTelefono(),
            o.getPrioridad().name(),
            o.getEstado().name(),
            o.getFechaProgramada(),
            o.getHoraEstimada(),
            o.getNotasTecnico(),
            o.getFechaCompletada(),
            o.getCreadoEn(),
            o.getMontoEstimado(),
            o.getFormaPago(),
            o.getPresupuestoId(),
            tentativo != null,
            tentativo != null ? tentativo.getVentanasDisponibles() : null
        );
    }

    // Presupuesto vinculado con fecha "a coordinar" (o null). Solo mientras la orden
    // sigue abierta: una cerrada ya no necesita coordinar nada.
    private Servicio presupuestoTentativo(OrdenVisita o) {
        if (o.getPresupuestoId() == null) return null;
        if (o.getEstado() != EstadoOrden.PENDIENTE && o.getEstado() != EstadoOrden.EN_CAMINO
                && o.getEstado() != EstadoOrden.EN_SITIO && o.getEstado() != EstadoOrden.NO_ATENDIDO) return null;
        return servicioRepository.findById(o.getPresupuestoId())
                .filter(sv -> Boolean.TRUE.equals(sv.getFechaTentativa()))
                .orElse(null);
    }

    // ── Vía de salida del técnico (29-sep-2026) ───────────────────────────────
    // Hasta ahora el técnico solo podía decir "el cliente no atendió". Faltaba
    // "no puedo ir YO" (salud, transporte, un problema personal) y un canal para
    // avisarle al admin. Cada caso manda UN aviso urgente (app + push + WhatsApp).

    private static final List<EstadoOrden> ABIERTAS =
        List.of(EstadoOrden.PENDIENTE, EstadoOrden.EN_CAMINO, EstadoOrden.EN_SITIO);

    // Devuelve la orden: con presupuesto → se cancela y el presupuesto vuelve a
    // "Pendientes" para reasignarlo; sin presupuesto → queda "para reprogramar".
    private String devolverOrden(OrdenVisita o, String nota) {
        o.setNotasTecnico(nota);
        o.setFechaCompletada(null);
        if (o.getPresupuestoId() != null) {
            o.setEstado(EstadoOrden.CANCELADA);
            servicioRepository.findById(o.getPresupuestoId()).ifPresent(sv -> {
                if (sv.getEstado() == EstadoServicio.EN_PROGRESO) {
                    sv.setEstado(EstadoServicio.PRESUPUESTO);
                    servicioRepository.save(sv);
                }
            });
            repo.save(o);
            return "volvió a Pendientes para reasignar";
        }
        o.setEstado(EstadoOrden.NO_ATENDIDO);
        repo.save(o);
        return "quedó para reprogramar";
    }

    private void avisarAdmins(TipoNotificacion tipo, Usuario tecnico, String titulo, String detalle, Long refId) {
        usuarioRepo.findAll().stream()
            .filter(u -> u.getRol() == RolUsuario.ADMIN && u.isActivo())
            .forEach(admin -> notificacionService.notificar(tipo, admin.getId(), tecnico.getId(),
                titulo, detalle, refId, true));
    }

    @Transactional
    public OrdenVisitaDTO noPuedoAsistir(Long id, String motivo, String detalle) {
        OrdenVisita o = repo.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("Orden no encontrada: " + id));
        if (!ABIERTAS.contains(o.getEstado())) {
            throw new IllegalArgumentException("Esta orden ya no está abierta");
        }
        String texto = "No puede ir (" + (motivo != null && !motivo.isBlank() ? motivo : "sin motivo") + ")"
            + (detalle != null && !detalle.isBlank() ? ": " + detalle.trim() : "");
        String destino = devolverOrden(o, texto);
        String cliente = o.getClienteNombre() != null ? o.getClienteNombre() : o.getTitulo();
        avisarAdmins(TipoNotificacion.ORDEN_NO_ATENDIDO, o.getTecnico(),
            o.getTecnico().getNombre() + " no puede ir · " + cliente,
            texto + " — la visita " + destino + ". Avisale al cliente.", o.getId());
        return toDTO(o);
    }

    @Transactional
    public int noPuedoHoy(Usuario tecnico, String motivo, String detalle) {
        LocalDate hoy = LocalDate.now();
        List<OrdenVisita> deHoy = repo.findByTecnicoIdOrderByFechaProgramadaAscHoraEstimadaAsc(tecnico.getId()).stream()
            .filter(o -> ABIERTAS.contains(o.getEstado()))
            .filter(o -> o.getFechaProgramada() == null || !o.getFechaProgramada().isAfter(hoy))
            .toList();
        String texto = "No puede trabajar hoy (" + (motivo != null && !motivo.isBlank() ? motivo : "sin motivo") + ")"
            + (detalle != null && !detalle.isBlank() ? ": " + detalle.trim() : "");
        deHoy.forEach(o -> devolverOrden(o, texto));
        String clientes = deHoy.stream()
            .map(o -> o.getClienteNombre() != null ? o.getClienteNombre() : o.getTitulo())
            .collect(Collectors.joining(", "));
        avisarAdmins(TipoNotificacion.ORDEN_NO_ATENDIDO, tecnico,
            tecnico.getNombre() + " no puede trabajar hoy",
            texto + (deHoy.isEmpty() ? "" : " — " + deHoy.size() + " visita(s) para reasignar: " + clientes + ". Avisales a los clientes."),
            null);
        return deHoy.size();
    }

    public void mensajeAlAdmin(Usuario tecnico, String mensaje) {
        if (mensaje == null || mensaje.isBlank()) throw new IllegalArgumentException("Escribí el mensaje");
        avisarAdmins(TipoNotificacion.MENSAJE_LIBRE, tecnico,
            "Mensaje de " + tecnico.getNombre(), mensaje.trim(), null);
    }
}
