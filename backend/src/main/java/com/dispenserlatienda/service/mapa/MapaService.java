package com.dispenserlatienda.service.mapa;

import com.dispenserlatienda.domain.cliente.Cliente;
import com.dispenserlatienda.domain.mapa.GeoUbicacion;
import com.dispenserlatienda.domain.sede.Sede;
import com.dispenserlatienda.domain.servicio.EstadoServicio;
import com.dispenserlatienda.dto.empresa.PedidoEmpresaDTO;
import com.dispenserlatienda.dto.orden.OrdenVisitaDTO;
import com.dispenserlatienda.dto.radar.RadarAlertaDTO;
import com.dispenserlatienda.repository.cliente.ClienteRepository;
import com.dispenserlatienda.repository.sede.SedeRepository;
import com.dispenserlatienda.service.empresa.PedidoEmpresaService;
import com.dispenserlatienda.service.orden.OrdenVisitaService;
import com.dispenserlatienda.service.radar.RadarService;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.*;

// Mapa del admin (7-oct-2026): clientes/sedes, visitas de un día, pedidos de
// empresas sin agendar y mantenimiento vencido (Radar), cada uno con sus
// coordenadas (ver GeocodificadorService).
@Service
public class MapaService {

    private static final List<EstadoServicio> HECHOS = List.of(
        EstadoServicio.COMPLETADO, EstadoServicio.PENDIENTE_FACTURACION,
        EstadoServicio.FACTURADO, EstadoServicio.COBRADO, EstadoServicio.REALIZADO);

    @PersistenceContext
    private EntityManager em;
    private final SedeRepository sedeRepo;
    private final ClienteRepository clienteRepo;
    private final OrdenVisitaService ordenService;
    private final PedidoEmpresaService pedidoService;
    private final RadarService radarService;
    private final GeocodificadorService geo;

    public MapaService(SedeRepository sedeRepo, ClienteRepository clienteRepo, OrdenVisitaService ordenService,
                       PedidoEmpresaService pedidoService, RadarService radarService, GeocodificadorService geo) {
        this.sedeRepo = sedeRepo;
        this.clienteRepo = clienteRepo;
        this.ordenService = ordenService;
        this.pedidoService = pedidoService;
        this.radarService = radarService;
        this.geo = geo;
    }

    @Transactional
    public Map<String, Object> mapa(LocalDate fecha) {
        LocalDate dia = fecha != null ? fecha : LocalDate.now();

        // ── Clientes: cada sede activa con dirección; clientes sin sede, su dirección
        List<Sede> sedes = sedeRepo.findAll().stream()
            .filter(s -> s.isActiva() && s.getCliente() != null && s.getDireccion() != null && !s.getDireccion().isBlank())
            .toList();
        Set<Long> clientesConSede = new HashSet<>();
        sedes.forEach(s -> clientesConSede.add(s.getCliente().getId()));
        List<Cliente> sinSede = clienteRepo.findAll().stream()
            .filter(c -> !clientesConSede.contains(c.getId()) && direccionDe(c) != null).toList();

        Map<Long, Long> equiposPorSede = new HashMap<>();
        for (Object[] f : em.createQuery("select e.sede.id, count(e) from Equipo e group by e.sede.id", Object[].class).getResultList())
            equiposPorSede.put((Long) f[0], (Long) f[1]);
        Map<Long, LocalDate> ultimaPorSede = new HashMap<>();
        for (Object[] f : em.createQuery("select s.sede.id, max(s.fechaServicio) from Servicio s where s.estado in :e group by s.sede.id", Object[].class)
                .setParameter("e", HECHOS).getResultList())
            if (f[0] != null) ultimaPorSede.put((Long) f[0], (LocalDate) f[1]);

        // Radar: equipos con mantenimiento vencido → su sede
        Map<Long, Map<String, Object>> radarPorSede = new HashMap<>();
        List<RadarAlertaDTO> alertas = List.of();
        try { alertas = radarService.generarAlertas(); } catch (Exception ignored) { }
        if (!alertas.isEmpty()) {
            Map<String, RadarAlertaDTO> porSerie = new HashMap<>();
            alertas.forEach(a -> { if (a.getSerial() != null) porSerie.putIfAbsent(a.getSerial().toUpperCase(), a); });
            for (Object[] f : em.createQuery("select upper(e.numeroSerie), e.sede.id from Equipo e where upper(e.numeroSerie) in :s", Object[].class)
                    .setParameter("s", porSerie.keySet()).getResultList()) {
                RadarAlertaDTO a = porSerie.get((String) f[0]);
                Long sid = (Long) f[1];
                Map<String, Object> r = radarPorSede.computeIfAbsent(sid, k -> new LinkedHashMap<>(Map.of("equipos", 0, "meses", 0)));
                r.put("equipos", (Integer) r.get("equipos") + 1);
                if (a.getMeses() > (Integer) r.get("meses")) { r.put("meses", a.getMeses()); r.put("tipo", a.getTipoAlerta()); }
            }
        }

        // ── Visitas del día y pedidos sin agendar
        List<OrdenVisitaDTO> visitas = ordenService.listarTodas(dia, dia).stream()
            .filter(o -> dia.equals(o.fechaProgramada()) && !"CANCELADA".equals(o.estado()))
            .toList();
        List<PedidoEmpresaDTO> pedidos = pedidoService.listarTodos().stream()
            .filter(p -> List.of("NUEVO", "NO_ATENDIDO", "PAUSADO").contains(p.estado())).toList();

        // ── Coordenadas de todo de una vez
        List<String> dirs = new ArrayList<>();
        sedes.forEach(s -> dirs.add(s.getDireccion()));
        sinSede.forEach(c -> dirs.add(direccionDe(c)));
        visitas.forEach(o -> { if (o.direccion() != null) dirs.add(o.direccion()); });
        pedidos.forEach(p -> { if (p.direccion() != null) dirs.add(p.direccion()); });
        Map<String, GeoUbicacion> ub = geo.ubicar(dirs);

        List<Map<String, Object>> clientes = new ArrayList<>();
        for (Sede s : sedes) {
            Map<String, Object> m = punto("sede-" + s.getId(), s.getDireccion(), ub);
            m.put("sedeId", s.getId());
            m.put("clienteId", s.getCliente().getId());
            m.put("cliente", s.getCliente().getNombre());
            m.put("sede", s.getNombreSede());
            m.put("equipos", equiposPorSede.getOrDefault(s.getId(), 0L));
            m.put("ultimaVisita", ultimaPorSede.get(s.getId()));
            m.put("radar", radarPorSede.get(s.getId()));
            clientes.add(m);
        }
        for (Cliente c : sinSede) {
            Map<String, Object> m = punto("cli-" + c.getId(), direccionDe(c), ub);
            m.put("clienteId", c.getId());
            m.put("cliente", c.getNombre());
            m.put("equipos", 0L);
            clientes.add(m);
        }
        List<Map<String, Object>> vis = new ArrayList<>();
        for (OrdenVisitaDTO o : visitas) {
            Map<String, Object> m = punto("vis-" + o.id(), o.direccion(), ub);
            m.put("ordenId", o.id());
            m.put("cliente", o.clienteNombre() != null ? o.clienteNombre() : o.titulo());
            m.put("clienteId", o.clienteId());
            m.put("titulo", o.titulo());
            m.put("hora", o.horaEstimada());
            m.put("estado", o.estado());
            m.put("tecnicoId", o.tecnicoId());
            m.put("tecnico", o.tecnicoNombre());
            vis.add(m);
        }
        List<Map<String, Object>> peds = new ArrayList<>();
        for (PedidoEmpresaDTO p : pedidos) {
            Map<String, Object> m = punto("ped-" + p.id(), p.direccion(), ub);
            m.put("pedidoId", p.id());
            m.put("cliente", p.clienteNombre());
            m.put("clienteId", p.clienteId());
            m.put("lugar", p.lugar());
            m.put("motivo", p.motivo());
            m.put("urgente", p.urgente());
            m.put("estado", p.estado());
            peds.add(m);
        }
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("fecha", dia);
        out.put("clientes", clientes);
        out.put("visitas", vis);
        out.put("pedidos", peds);
        out.put("pendientes", geo.pendientes());
        return out;
    }

    private Map<String, Object> punto(String id, String direccion, Map<String, GeoUbicacion> ub) {
        GeoUbicacion g = geo.de(ub, direccion);
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", id);
        m.put("direccion", direccion);
        m.put("lat", g != null ? g.getLat() : null);
        m.put("lng", g != null ? g.getLng() : null);
        m.put("geo", g != null ? g.getEstado() : "SIN_DIRECCION");
        m.put("manual", g != null && g.isManual());
        return m;
    }

    static String direccionDe(Cliente c) {
        if (c.getDireccion() != null && !c.getDireccion().isBlank()) return c.getDireccion().trim();
        String calle = String.join(" ", java.util.stream.Stream.of(c.getCalle(), c.getNumero())
            .filter(x -> x != null && !x.isBlank()).toList());
        if (calle.isBlank()) return null;
        return c.getLocalidad() != null && !c.getLocalidad().isBlank() ? calle + ", " + c.getLocalidad() : calle;
    }
}
