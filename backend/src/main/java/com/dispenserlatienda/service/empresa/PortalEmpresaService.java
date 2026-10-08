package com.dispenserlatienda.service.empresa;

import com.dispenserlatienda.domain.empresa.PedidoEmpresa;
import com.dispenserlatienda.domain.empresa.ResumenAprobacion;
import com.dispenserlatienda.domain.notificacion.TipoNotificacion;
import com.dispenserlatienda.domain.orden.EstadoOrden;
import com.dispenserlatienda.domain.orden.OrdenVisita;
import com.dispenserlatienda.domain.servicio.EstadoServicio;
import com.dispenserlatienda.domain.usuario.RolUsuario;
import com.dispenserlatienda.domain.usuario.Usuario;
import com.dispenserlatienda.exception.BusinessException;
import com.dispenserlatienda.repository.cliente.ClienteRepository;
import com.dispenserlatienda.repository.empresa.PedidoEmpresaRepository;
import com.dispenserlatienda.repository.empresa.ResumenAprobacionRepository;
import com.dispenserlatienda.repository.orden.OrdenVisitaRepository;
import com.dispenserlatienda.repository.usuario.UsuarioRepository;
import com.dispenserlatienda.service.equipo.HistorialEquipoService;
import com.dispenserlatienda.service.notificacion.NotificacionService;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.*;
import java.util.stream.Collectors;

// Portal Empresa — etapa 4 (8-oct-2026): aprobación del resumen del mes, indicadores
// y aviso automático de mantenimientos que se vencen. Siempre filtrado por el cliente
// de la empresa (y por su lugar si es encargado de una sede).
@Service
public class PortalEmpresaService {

    private static final List<EstadoServicio> HECHOS = List.of(
        EstadoServicio.COMPLETADO, EstadoServicio.PENDIENTE_FACTURACION,
        EstadoServicio.FACTURADO, EstadoServicio.COBRADO, EstadoServicio.REALIZADO);

    @PersistenceContext
    private EntityManager em;
    private final ResumenAprobacionRepository aprobRepo;
    private final PedidoEmpresaRepository pedidoRepo;
    private final OrdenVisitaRepository ordenRepo;
    private final UsuarioRepository usuarioRepo;
    private final ClienteRepository clienteRepo;
    private final NotificacionService notificaciones;
    private final HistorialEquipoService historial;
    private final PedidoEmpresaService pedidos;

    public PortalEmpresaService(ResumenAprobacionRepository aprobRepo, PedidoEmpresaRepository pedidoRepo,
                                OrdenVisitaRepository ordenRepo, UsuarioRepository usuarioRepo, ClienteRepository clienteRepo,
                                NotificacionService notificaciones, HistorialEquipoService historial, PedidoEmpresaService pedidos) {
        this.aprobRepo = aprobRepo;
        this.pedidoRepo = pedidoRepo;
        this.ordenRepo = ordenRepo;
        this.usuarioRepo = usuarioRepo;
        this.clienteRepo = clienteRepo;
        this.notificaciones = notificaciones;
        this.historial = historial;
        this.pedidos = pedidos;
    }

    // ── Aprobación del resumen del mes ───────────────────────────────────────

    public Map<String, Object> aprobacion(Long clienteId, String mes) {
        return aprobRepo.findByClienteIdAndMes(clienteId, mes).map(PortalEmpresaService::aMapa).orElse(null);
    }

    @Transactional
    public Map<String, Object> aprobar(Usuario empresa, String mes, boolean aprobado, String comentario, List<Long> observados) {
        Long clienteId = pedidos.clienteDeEmpresa(empresa);
        if (empresa.getSedeId() != null) throw new AccessDeniedException("El resumen lo aprueba el responsable de la empresa");
        YearMonth ym;
        try { ym = YearMonth.parse(mes); } catch (Exception e) { throw new BusinessException("Mes inválido"); }
        if (ym.isAfter(YearMonth.now())) throw new BusinessException("Ese mes todavía no empezó");
        String com = comentario == null || comentario.isBlank() ? null : comentario.trim();
        List<Long> obs = observados == null ? List.of() : observados.stream().filter(Objects::nonNull).distinct().limit(500).toList();
        if (!aprobado && com == null && obs.isEmpty()) throw new BusinessException("Marcá qué no reconocés o contanos qué pasa");
        ResumenAprobacion a = aprobRepo.findByClienteIdAndMes(clienteId, ym.toString()).orElseGet(ResumenAprobacion::new);
        a.setClienteId(clienteId);
        a.setMes(ym.toString());
        a.setEstado(aprobado ? "APROBADO" : "OBSERVADO");
        a.setComentario(com);
        a.setObservados(aprobado || obs.isEmpty() ? null : obs.stream().map(String::valueOf).collect(Collectors.joining(",")));
        a.setUsuarioNombre(empresa.getNombre());
        a.setActualizadoEn(LocalDateTime.now());
        aprobRepo.save(a);
        String cliente = clienteRepo.findById(clienteId).map(c -> c.getNombre()).orElse("Empresa");
        String mesTxt = ym.getMonth().getDisplayName(java.time.format.TextStyle.FULL, new Locale("es", "AR")) + " " + ym.getYear();
        usuarioRepo.findAll().stream().filter(u -> u.getRol() == RolUsuario.ADMIN && u.isActivo())
            .forEach(u -> notificaciones.notificar(TipoNotificacion.MENSAJE_LIBRE, u.getId(), empresa.getId(),
                aprobado ? "✓ " + cliente + " aprobó el resumen de " + mesTxt : "⚠️ " + cliente + " observó el resumen de " + mesTxt,
                (aprobado ? "Ya podés facturar." : (obs.isEmpty() ? "" : obs.size() + " renglón(es) que no reconoce. ")) + (com != null ? com : ""),
                null, !aprobado));
        return aMapa(a);
    }

    private static Map<String, Object> aMapa(ResumenAprobacion a) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("estado", a.getEstado());
        m.put("comentario", a.getComentario());
        m.put("observados", a.getObservados() == null ? List.of()
            : Arrays.stream(a.getObservados().split(",")).map(Long::valueOf).toList());
        m.put("usuario", a.getUsuarioNombre());
        m.put("fecha", a.getActualizadoEn());
        return m;
    }

    // ── Indicadores ──────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public Map<String, Object> indicadores(Usuario empresa, int meses) {
        Long clienteId = pedidos.clienteDeEmpresa(empresa);
        Long sedeId = empresa.getSedeId();
        int n = Math.max(3, Math.min(12, meses));
        YearMonth hasta = YearMonth.now(), desde = hasta.minusMonths(n - 1);
        LocalDate fDesde = desde.atDay(1);

        // Pedidos y su tiempo de resolución (desde que lo cargaron hasta que se terminó)
        List<PedidoEmpresa> lista = pedidoRepo.findByClienteIdOrderByCreadoEnDesc(clienteId).stream()
            .filter(p -> sedeId == null || sedeId.equals(p.getSedeId()))
            .filter(p -> !p.getCreadoEn().toLocalDate().isBefore(fDesde)).toList();
        Set<Long> ordenIds = lista.stream().map(PedidoEmpresa::getOrdenId).filter(Objects::nonNull).collect(Collectors.toSet());
        Map<Long, OrdenVisita> ordenes = new HashMap<>();
        if (!ordenIds.isEmpty()) ordenRepo.findAllById(ordenIds).forEach(o -> ordenes.put(o.getId(), o));
        List<Double> horas = new ArrayList<>(), horasUrg = new ArrayList<>();
        Map<String, Integer> pedidosMes = new LinkedHashMap<>(), visitasMes = new LinkedHashMap<>();
        for (YearMonth m = desde; !m.isAfter(hasta); m = m.plusMonths(1)) { pedidosMes.put(m.toString(), 0); visitasMes.put(m.toString(), 0); }
        int conformes = 0, reclamos = 0, sumaCal = 0, conCal = 0;
        for (PedidoEmpresa p : lista) {
            pedidosMes.merge(YearMonth.from(p.getCreadoEn()).toString(), 1, Integer::sum);
            OrdenVisita o = p.getOrdenId() != null ? ordenes.get(p.getOrdenId()) : null;
            if (o != null && o.getEstado() == EstadoOrden.COMPLETADA && o.getFechaCompletada() != null) {
                double h = Math.max(0, Duration.between(p.getCreadoEn(), o.getFechaCompletada()).toMinutes() / 60.0);
                horas.add(h);
                if (p.isUrgente()) horasUrg.add(h);
            }
            if ("CONFORME".equals(p.getConformidad())) conformes++;
            if ("PROBLEMA".equals(p.getConformidad())) reclamos++;
            if (p.getCalificacion() != null) { sumaCal += p.getCalificacion(); conCal++; }
        }

        // Visitas hechas por mes y equipos con más visitas (de lo cargado como trabajo)
        List<Object[]> filas = em.createQuery(
                "select s.id, s.fechaServicio, s.sede.id, e.numeroSerie, s.sede.nombreSede from Servicio s join s.items i left join i.equipo e " +
                "where s.sede.cliente.id = :cid and s.fechaServicio >= :d and s.estado in :estados", Object[].class)
            .setParameter("cid", clienteId).setParameter("d", fDesde).setParameter("estados", HECHOS).getResultList();
        Map<String, Set<Long>> visitasPorMes = new HashMap<>();
        Map<String, Integer> porEquipo = new HashMap<>();
        Map<String, String> lugarEquipo = new HashMap<>();
        for (Object[] f : filas) {
            if (sedeId != null && !sedeId.equals(f[2])) continue;
            visitasPorMes.computeIfAbsent(YearMonth.from((LocalDate) f[1]).toString(), k -> new HashSet<>()).add((Long) f[0]);
            if (f[3] != null) { porEquipo.merge((String) f[3], 1, Integer::sum); lugarEquipo.putIfAbsent((String) f[3], (String) f[4]); }
        }
        visitasMes.replaceAll((k, v) -> visitasPorMes.getOrDefault(k, Set.of()).size());
        List<Map<String, Object>> top = porEquipo.entrySet().stream()
            .filter(e -> e.getValue() > 1)
            .sorted(Map.Entry.<String, Integer>comparingByValue().reversed()).limit(5)
            .map(e -> { Map<String, Object> m = new LinkedHashMap<>(); m.put("serie", e.getKey()); m.put("lugar", lugarEquipo.get(e.getKey())); m.put("visitas", e.getValue()); return m; })
            .toList();

        List<Map<String, Object>> serie = new ArrayList<>();
        pedidosMes.forEach((m, c) -> { Map<String, Object> x = new LinkedHashMap<>(); x.put("mes", m); x.put("pedidos", c); x.put("visitas", visitasMes.get(m)); serie.add(x); });
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("meses", n);
        out.put("pedidos", lista.size());
        out.put("resueltos", horas.size());
        out.put("horasPromedio", horas.isEmpty() ? null : Math.round(horas.stream().mapToDouble(d -> d).average().orElse(0) * 10) / 10.0);
        out.put("horasPromedioUrgentes", horasUrg.isEmpty() ? null : Math.round(horasUrg.stream().mapToDouble(d -> d).average().orElse(0) * 10) / 10.0);
        out.put("conformes", conformes);
        out.put("reclamos", reclamos);
        out.put("calificacionPromedio", conCal == 0 ? null : Math.round(sumaCal * 10.0 / conCal) / 10.0);
        out.put("porMes", serie);
        out.put("equiposConMasVisitas", top);
        return out;
    }

    // ── Aviso de mantenimientos que se vencen (todos los días a las 9) ─────────
    // A cada usuario empresa le llega UN aviso con los equipos que vencen en 15 días.
    @Scheduled(cron = "0 0 9 * * *", zone = "America/Argentina/Buenos_Aires")
    public void avisarMantenimientos() {
        LocalDate objetivo = LocalDate.now().plusDays(15);
        Map<Long, List<Usuario>> porCliente = usuarioRepo.findAll().stream()
            .filter(u -> u.getRol() == RolUsuario.EMPRESA && u.isActivo() && u.getClienteId() != null)
            .collect(Collectors.groupingBy(Usuario::getClienteId));
        porCliente.forEach((clienteId, usuarios) -> {
            try {
                List<Map<String, Object>> vencen = historial.mantenimientos(clienteId, null).stream()
                    .filter(m -> objetivo.equals(m.get("vence"))).toList();
                if (vencen.isEmpty()) return;
                for (Usuario u : usuarios) {
                    List<Map<String, Object>> suyos = vencen.stream()
                        .filter(m -> u.getSedeId() == null || u.getSedeId().equals(m.get("sedeId"))).toList();
                    if (suyos.isEmpty()) continue;
                    String lista = suyos.stream().limit(8)
                        .map(m -> "• " + m.get("serie") + (m.get("sede") != null ? " · " + m.get("sede") : "")
                            + " (" + ("FILTRO".equals(m.get("tipo")) ? "cambio de filtro" : "sanitización") + ")")
                        .collect(Collectors.joining("\n"));
                    notificaciones.notificar(TipoNotificacion.MENSAJE_LIBRE, u.getId(), null,
                        "🗓️ Mantenimiento en 15 días · " + suyos.size() + " equipo" + (suyos.size() != 1 ? "s" : ""),
                        lista + (suyos.size() > 8 ? "\n…" : "") + "\nPedilo desde «Services» y lo agendamos.", null, false);
                }
            } catch (Exception e) { /* un cliente con datos raros no frena al resto */ }
        });
    }
}
