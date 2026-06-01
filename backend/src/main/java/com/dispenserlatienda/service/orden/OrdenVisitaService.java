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
import com.dispenserlatienda.service.common.WhatsAppService;
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
    private final ServicioRepository    servicioRepository;
    private final SedeRepository        sedeRepository;

    public OrdenVisitaService(OrdenVisitaRepository repo,
                              UsuarioRepository usuarioRepo,
                              WhatsAppService whatsApp,
                              ServicioRepository servicioRepository,
                              SedeRepository sedeRepository) {
        this.repo              = repo;
        this.usuarioRepo       = usuarioRepo;
        this.whatsApp          = whatsApp;
        this.servicioRepository = servicioRepository;
        this.sedeRepository    = sedeRepository;
    }

    // ── Admin: crear orden ─────────────────────────────────────────────────────
    @Transactional
    public OrdenVisitaDTO crear(OrdenVisitaCreateDTO dto) {
        Usuario tecnico = usuarioRepo.findById(dto.tecnicoId())
            .orElseThrow(() -> new IllegalArgumentException("Técnico no encontrado: " + dto.tecnicoId()));

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
        notificarTecnico(tecnico, saved);
        return saved;
    }

    // ── Admin: editar orden ────────────────────────────────────────────────────
    @Transactional
    public OrdenVisitaDTO actualizar(Long id, OrdenVisitaCreateDTO dto) {
        OrdenVisita o = repo.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("Orden no encontrada: " + id));

        Usuario tecnico = usuarioRepo.findById(dto.tecnicoId())
            .orElseThrow(() -> new IllegalArgumentException("Técnico no encontrado: " + dto.tecnicoId()));

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

        return toDTO(repo.save(o));
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

        return toDTO(repo.save(o));
    }

    // ── Cascade al completar una orden ────────────────────────────────────────
    private void sincronizarConServicios(OrdenVisita o) {
        if (o.getPresupuestoId() != null) {
            // Caso 1: orden vinculada a presupuesto → marcar REALIZADO y asignar técnico para rendimientos
            servicioRepository.findById(o.getPresupuestoId()).ifPresent(s -> {
                // Técnico terminó — ahora falta definir cobro
                s.setEstado(EstadoServicio.COMPLETADO);
                s.setFechaCompletado(java.time.LocalDateTime.now());
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
            o.getPresupuestoId()
        );
    }
}
