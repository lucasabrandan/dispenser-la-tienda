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
        // Solo frena si hay una visita EN CURSO; una ya hecha (COMPLETADA) no impide
        // agendar otra (6-oct-2026: el trabajo volvía a Presupuesto y no se podía despachar).
        if (dto.presupuestoId() != null && repo.existsByPresupuestoIdAndEstadoNotIn(
                dto.presupuestoId(), List.of(EstadoOrden.CANCELADA, EstadoOrden.NO_ATENDIDO, EstadoOrden.COMPLETADA))) {
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
        o.setEquiposSerie(dto.equiposSerie());

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
        Usuario tecnicoAnterior = o.getTecnico();
        boolean cambioDia = !java.util.Objects.equals(o.getFechaProgramada(), dto.fechaProgramada())
            || !java.util.Objects.equals(o.getHoraEstimada(), dto.horaEstimada())
            || o.getEstado() == EstadoOrden.NO_ATENDIDO;
        // Si cambia quién, el día o la hora, el técnico tiene que volver a confirmar
        if (cambioTecnico || !java.util.Objects.equals(o.getFechaProgramada(), dto.fechaProgramada())
                || !java.util.Objects.equals(o.getHoraEstimada(), dto.horaEstimada())) {
            o.setConfirmadaEn(null);
        }
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
        // El formulario viejo de edición no manda los equipos: si no vienen, se mantienen
        if (dto.equiposSerie() != null) o.setEquiposSerie(dto.equiposSerie());

        // Si estaba NO_ATENDIDO, reprogramar la vuelve a PENDIENTE
        if (o.getEstado() == EstadoOrden.NO_ATENDIDO) {
            o.setEstado(EstadoOrden.PENDIENTE);
            o.setFechaCompletada(null);
        }

        OrdenVisitaDTO guardada = toDTO(repo.save(o));
        String cliente = guardada.clienteNombre() != null && !guardada.clienteNombre().isBlank() ? guardada.clienteNombre() : guardada.titulo();
        if (cambioTecnico) {
            notificarTecnico(tecnico, guardada);
            notificacionService.notificar(TipoNotificacion.ORDEN_ASIGNADA, tecnico.getId(), null,
                guardada.titulo(), guardada.clienteNombre() != null ? guardada.clienteNombre() : "",
                guardada.id(), false);
            // Al que la tenía antes se le avisa que ya no va (7-oct-2026)
            notificacionService.notificar(TipoNotificacion.MENSAJE_LIBRE, tecnicoAnterior.getId(), null,
                "Visita reasignada · " + cliente, "La va a hacer otro técnico: ya no la tenés que hacer.",
                guardada.id(), false);
        } else if (cambioDia) {
            // Reprogramada desde el admin (7-oct-2026): antes no le llegaba nada al técnico
            String cuando = (dto.fechaProgramada() != null ? dto.fechaProgramada().format(DateTimeFormatter.ofPattern("dd/MM")) : "sin fecha")
                + (dto.horaEstimada() != null && !dto.horaEstimada().isBlank() ? " " + dto.horaEstimada() : "");
            notificacionService.notificar(TipoNotificacion.ORDEN_ASIGNADA, tecnico.getId(), null,
                "Cambió tu visita · " + cliente, "Nuevo día: " + cuando, guardada.id(), false);
        }
        // El trabajo (presupuesto) queda con el mismo día que su visita
        if (cambioDia && dto.presupuestoId() != null && dto.fechaProgramada() != null) {
            servicioRepository.findById(dto.presupuestoId()).ifPresent(sv -> {
                sv.setFechaServicio(dto.fechaProgramada());
                // hora_servicio es de 5 caracteres ("10:30"): la franja ("Mañana"/"Tarde") no entra
                String h = dto.horaEstimada() != null ? dto.horaEstimada().trim() : "";
                sv.setHoraServicio(h.matches("\\d{1,2}:\\d{2}.*") ? h.replaceAll("^(\\d{1,2}:\\d{2}).*$", "$1") : null);
                servicioRepository.save(sv);
            });
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
        // 2-oct-2026: el badge del menú contaba órdenes activas de semanas anteriores que
        // el Despacho (solo esta semana) no mostraba — "dice 5 y no veo nada". Se suman
        // las activas atrasadas adelante de todo.
        List<OrdenVisita> atrasadas = repo.findActivasAtrasadas(d);
        List<OrdenVisita> rango = repo.findByFechaProgramadaBetweenOrderByTecnicoIdAscFechaProgramadaAsc(d, h);
        return java.util.stream.Stream.concat(atrasadas.stream(), rango.stream())
            .map(this::toDTO).collect(Collectors.toList());
    }

    // Una orden puntual (para abrirla desde una notificación, 5-oct-2026)
    public OrdenVisitaDTO obtener(Long id) {
        return repo.findById(id).map(this::toDTO)
            .orElseThrow(() -> new IllegalArgumentException("Orden no encontrada: " + id));
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
            // Visitas con equipos por N/S (tarifa mensual): los servicios los arma la carga por serie
            if (o.getEquiposSerie() != null && !o.getEquiposSerie().isBlank()) return;

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
            esAdminActual() ? o.getClienteTelefono() : null, // el técnico no recibe el teléfono del cliente (5-oct-2026)
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
            tentativo != null ? tentativo.getVentanasDisponibles() : null,
            o.getEquiposSerie(),
            o.getConfirmadaEn()
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
        // Una línea por visita (hora · cliente · dirección) para reasignar sin abrir la app (7-oct-2026)
        String visitas = deHoy.stream()
            .map(o -> "• " + (o.getHoraEstimada() != null && !o.getHoraEstimada().isBlank() ? (o.getHoraEstimada().length() > 5 ? o.getHoraEstimada().substring(0, 5) : o.getHoraEstimada()) : "Sin horario")
                + " " + (o.getClienteNombre() != null ? o.getClienteNombre() : o.getTitulo())
                + (o.getDireccion() != null && !o.getDireccion().isBlank() ? " · " + o.getDireccion() : ""))
            .collect(Collectors.joining("\n"));
        avisarAdmins(TipoNotificacion.ORDEN_NO_ATENDIDO, tecnico,
            tecnico.getNombre() + " no puede trabajar hoy",
            texto + (deHoy.isEmpty() ? "" : "\n" + deHoy.size() + " visita(s) para reasignar:\n" + visitas + "\nAvisales a los clientes."),
            null);
        return deHoy.size();
    }

    // Técnico: "Ok, voy" (5-oct-2026). Aviso al admin solo en la app (sin WhatsApp).
    @Transactional
    public OrdenVisitaDTO confirmar(Long id) {
        OrdenVisita o = repo.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("Orden no encontrada: " + id));
        if (!ABIERTAS.contains(o.getEstado())) throw new IllegalArgumentException("Esta orden ya no está abierta");
        if (o.getConfirmadaEn() == null) {
            o.setConfirmadaEn(java.time.LocalDateTime.now());
            String cliente = o.getClienteNombre() != null ? o.getClienteNombre() : o.getTitulo();
            String cuando = (o.getFechaProgramada() != null ? o.getFechaProgramada().toString() : "")
                + (o.getHoraEstimada() != null ? " " + o.getHoraEstimada() : "");
            usuarioRepo.findAll().stream()
                .filter(u -> u.getRol() == RolUsuario.ADMIN && u.isActivo())
                .forEach(admin -> notificacionService.notificar(TipoNotificacion.MENSAJE_LIBRE,
                    admin.getId(), o.getTecnico().getId(),
                    o.getTecnico().getNombre() + " confirmó · " + cliente, "Va el " + cuando.trim(), o.getId(), false));
        }
        return toDTO(o);
    }

    public void mensajeAlAdmin(Usuario tecnico, String mensaje) {
        if (mensaje == null || mensaje.isBlank()) throw new IllegalArgumentException("Escribí el mensaje");
        avisarAdmins(TipoNotificacion.MENSAJE_LIBRE, tecnico,
            "Mensaje de " + tecnico.getNombre(), mensaje.trim(), null);
    }

    // ── Contacto con el cliente a través del admin (5-oct-2026) ─────────────────
    // El técnico no tiene el teléfono de los clientes de la empresa: pide y el
    // admin le escribe al cliente desde su WhatsApp, con el mensaje ya armado.
    private static boolean esAdminActual() {
        var auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        return auth != null && auth.getAuthorities().stream().anyMatch(a -> "ROLE_ADMIN".equals(a.getAuthority()));
    }

    public void pedirContactoCliente(Usuario tecnico, Long ordenId, String motivo, String detalle) {
        OrdenVisita o = repo.findById(ordenId)
            .orElseThrow(() -> new IllegalArgumentException("Orden no encontrada: " + ordenId));
        String m = (motivo == null || motivo.isBlank()) ? "Otro" : motivo.trim();
        String texto = m + (detalle != null && !detalle.isBlank() ? " · " + detalle.trim() : "");
        String cliente = o.getClienteNombre() != null ? o.getClienteNombre() : o.getTitulo();
        avisarAdmins(TipoNotificacion.MENSAJE_LIBRE, tecnico, "Contactar al cliente · " + cliente, texto, o.getId());
    }

    public java.util.Map<String, Object> contactoCliente(Long ordenId) {
        OrdenVisita o = repo.findById(ordenId)
            .orElseThrow(() -> new IllegalArgumentException("Orden no encontrada: " + ordenId));
        String tel = o.getClienteTelefono();
        if ((tel == null || tel.isBlank()) && o.getPresupuestoId() != null) {
            tel = servicioRepository.findById(o.getPresupuestoId())
                .map(Servicio::getSede).filter(java.util.Objects::nonNull)
                .map(Sede::getCliente).filter(java.util.Objects::nonNull)
                .map(c -> c.getTelefono()).orElse(null);
        }
        java.util.Map<String, Object> r = new java.util.HashMap<>();
        r.put("telefono", tel);
        r.put("clienteNombre", o.getClienteNombre());
        r.put("tecnicoNombre", o.getTecnico() != null ? o.getTecnico().getNombre() : null);
        return r;
    }

    public void clienteAvisado(Usuario admin, Long ordenId) {
        OrdenVisita o = repo.findById(ordenId)
            .orElseThrow(() -> new IllegalArgumentException("Orden no encontrada: " + ordenId));
        if (o.getTecnico() == null) return;
        notificacionService.notificar(TipoNotificacion.MENSAJE_LIBRE, o.getTecnico().getId(), admin.getId(),
            "✓ El admin avisó al cliente", o.getClienteNombre(), o.getId(), false);
    }
}
