package com.dispenserlatienda.controller.equipo;

import com.dispenserlatienda.domain.equipo.Equipo;
import com.dispenserlatienda.domain.orden.OrdenVisita;
import com.dispenserlatienda.domain.sede.Sede;
import com.dispenserlatienda.domain.servicio.EstadoServicio;
import com.dispenserlatienda.domain.servicio.Servicio;
import com.dispenserlatienda.domain.servicio.ServicioItem;
import com.dispenserlatienda.domain.usuario.RolUsuario;
import com.dispenserlatienda.domain.usuario.Usuario;
import com.dispenserlatienda.repository.equipo.EquipoRepository;
import com.dispenserlatienda.repository.usuario.UsuarioRepository;
import org.springframework.security.core.Authentication;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.*;

/**
 * Historial de un equipo por N° de serie, pensado para el técnico parado frente al
 * dispenser (2-oct-2026): qué se le hizo, cuándo, qué repuestos y si está en garantía.
 * Sin montos. Un técnico solo encuentra equipos en los que trabajó al menos una vez
 * (Lucas, 2-oct-2026: "trae máquinas que él no hizo"); el admin ve cualquiera.
 * /para-carga: búsqueda aparte para "Cargar equipos por N° de serie" — solo datos del
 * equipo (sin historial) y solo si el cliente trabaja con tarifa mensual.
 */
@RestController
@RequestMapping("/api/equipos/historial")
public class HistorialSerieController {

    private static final List<EstadoServicio> HECHOS = List.of(
        EstadoServicio.COMPLETADO, EstadoServicio.PENDIENTE_FACTURACION,
        EstadoServicio.FACTURADO, EstadoServicio.COBRADO, EstadoServicio.REALIZADO);

    @PersistenceContext
    private EntityManager em;
    private final EquipoRepository equipoRepository;
    private final ObjectMapper objectMapper;
    private final UsuarioRepository usuarioRepository;

    private final com.dispenserlatienda.service.seguridad.TecnicoAccesoService acceso;

    public HistorialSerieController(EquipoRepository equipoRepository, ObjectMapper objectMapper,
                                    UsuarioRepository usuarioRepository,
                                    com.dispenserlatienda.service.seguridad.TecnicoAccesoService acceso) {
        this.acceso = acceso;
        this.equipoRepository = equipoRepository;
        this.objectMapper = objectMapper;
        this.usuarioRepository = usuarioRepository;
    }

    private Usuario usuario(Authentication auth) {
        return usuarioRepository.findByUsername(auth.getName())
            .orElseThrow(() -> new IllegalStateException("Usuario no encontrado"));
    }

    private Equipo buscarExacto(String crudo) {
        final String s = Equipo.normalizarSerie(crudo);
        if (s == null) return null;
        Equipo e = equipoRepository.findFirstByNumeroSerie(s).orElse(null);
        if (e != null) return e;
        return equipoRepository.findByNumeroSerieContainingIgnoreCase(s,
                org.springframework.data.domain.PageRequest.of(0, 5))
            .stream().filter(x -> s.equalsIgnoreCase(x.getNumeroSerie())).findFirst().orElse(null);
    }

    private boolean trabajoEnEquipo(Long usuarioId, Long equipoId) {
        Long n = em.createQuery(
            "select count(i) from Servicio s join s.items i where i.equipo.id = :eid and s.usuario.id = :uid", Long.class)
            .setParameter("eid", equipoId).setParameter("uid", usuarioId).getSingleResult();
        return n != null && n > 0;
    }

    private Map<String, Object> datosEquipo(Equipo e) {
        Sede sede = e.getSede();
        Map<String, Object> eq = new LinkedHashMap<>();
        eq.put("serie", e.getNumeroSerie());
        eq.put("marca", e.getMarca());
        eq.put("modelo", e.getModelo());
        eq.put("ubicacion", e.getUbicacion());
        eq.put("cliente", sede != null && sede.getCliente() != null ? sede.getCliente().getNombre() : null);
        eq.put("clienteId", sede != null && sede.getCliente() != null ? sede.getCliente().getId() : null);
        eq.put("sedeId", sede != null ? sede.getId() : null);
        eq.put("sede", sede != null ? sede.getNombreSede() : null);
        eq.put("direccion", sede != null ? sede.getDireccion() : null);
        return eq;
    }

    @GetMapping("/para-carga")
    @Transactional(readOnly = true)
    public Map<String, Object> paraCarga(@RequestParam String serie, Authentication auth) {
        String s = serie == null ? "" : serie.replaceAll("\\s+", "").toUpperCase();
        if (s.isEmpty()) throw new IllegalArgumentException("Falta el N° de serie");
        Map<String, Object> out = new LinkedHashMap<>();
        Equipo e = buscarExacto(s);
        if (e == null) { out.put("encontrado", false); return out; }
        var cli = e.getSede() != null ? e.getSede().getCliente() : null;
        // Técnico: no revela de quién es un N/S de un cliente ajeno (7-oct-2026)
        Usuario u = usuario(auth);
        if (u.getRol() != RolUsuario.ADMIN && (cli == null || !acceso.tieneCliente(u.getId(), cli.getId()))) {
            out.put("encontrado", true); out.put("ajeno", true); out.put("tarifaVolumen", false);
            return out;
        }
        boolean tarifa = cli != null && cli.getTarifaVolumen() != null && !cli.getTarifaVolumen().isBlank();
        out.put("encontrado", true);
        out.put("tarifaVolumen", tarifa);
        if (!tarifa) {
            // No se exponen datos de equipos de clientes sin tarifa mensual
            out.put("cliente", cli != null ? cli.getNombre() : null);
            return out;
        }
        out.put("equipo", datosEquipo(e));
        return out;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public Map<String, Object> porSerie(@RequestParam String serie, Authentication auth) {
        String s = serie == null ? "" : serie.replaceAll("\\s+", "").toUpperCase();
        if (s.isEmpty()) throw new IllegalArgumentException("Falta el N° de serie");

        Map<String, Object> out = new LinkedHashMap<>();
        Usuario u = usuario(auth);
        boolean admin = u.getRol() == RolUsuario.ADMIN;
        Equipo e = buscarExacto(s);
        if (e != null && !admin && !trabajoEnEquipo(u.getId(), e.getId())) e = null;
        if (e == null) {
            // Búsqueda por parte de la serie (ej. "2909" → MS290926). Al técnico solo le
            // aparecen equipos en los que trabajó. Si queda uno solo, se muestra directo.
            List<Equipo> parecidos = equipoRepository.findByNumeroSerieContainingIgnoreCase(s,
                    org.springframework.data.domain.PageRequest.of(0, 40)).stream()
                .filter(x -> admin || trabajoEnEquipo(u.getId(), x.getId()))
                .limit(8).toList();
            if (parecidos.size() == 1) {
                e = parecidos.get(0);
            } else {
                out.put("encontrado", false);
                out.put("sugerencias", parecidos.stream().map(Equipo::getNumeroSerie).toList());
                return out;
            }
        }

        out.put("encontrado", true);
        out.put("equipo", datosEquipo(e));

        out.put("visitas", historial(e, 20));
        return out;
    }

    private List<Map<String, Object>> historial(Equipo e, int max) {
        List<Object[]> res = em.createQuery(
            "select s, i from Servicio s join s.items i where i.equipo.id = :eid and s.estado in :estados " +
            "order by s.fechaServicio desc, s.id desc", Object[].class)
            .setParameter("eid", e.getId())
            .setParameter("estados", HECHOS)
            .setMaxResults(max)
            .getResultList();

        List<Map<String, Object>> visitas = new ArrayList<>();
        for (Object[] r : res) {
            Servicio sv = (Servicio) r[0];
            ServicioItem it = (ServicioItem) r[1];
            List<Map<String, Object>> reps = new ArrayList<>();
            if (it.getRepuestosUsados() != null && !it.getRepuestosUsados().isBlank()) {
                try {
                    List<Map<String, Object>> crudos = objectMapper.readValue(it.getRepuestosUsados(), new TypeReference<>() {});
                    for (Map<String, Object> rp : crudos) {
                        Map<String, Object> m = new LinkedHashMap<>();
                        m.put("nombre", rp.getOrDefault("nombre", "Repuesto"));
                        m.put("cantidad", rp.getOrDefault("cantidad", 1));
                        reps.add(m);
                    }
                } catch (Exception ignored) { }
            }
            Map<String, Object> v = new LinkedHashMap<>();
            v.put("fecha", sv.getFechaServicio());
            v.put("servicioId", sv.getId());
            v.put("trabajo", it.getTrabajoRealizado());
            v.put("tecnico", it.getTecnico() != null ? it.getTecnico()
                : (sv.getUsuario() != null ? sv.getUsuario().getNombre() : null));
            v.put("garantiaHasta", it.getGarantiaHasta());
            v.put("repuestos", reps);
            visitas.add(v);
        }
        return visitas;
    }

    // Equipos de una visita con su historial (5-oct-2026), para que el técnico los
    // vea en la tarjeta de la visita sin buscar el N/S. Sale de los N/S de la orden,
    // de los ítems del presupuesto vinculado o, si no hay, de las sedes del cliente.
    // Solo el técnico asignado (o el admin). Sin montos.
    @GetMapping("/orden/{ordenId}")
    @Transactional(readOnly = true)
    public List<Map<String, Object>> deOrden(@PathVariable Long ordenId, Authentication auth) {
        Usuario u = usuario(auth);
        OrdenVisita o = em.find(OrdenVisita.class, ordenId);
        if (o == null) throw new com.dispenserlatienda.exception.ResourceNotFoundException("Visita no encontrada");
        if (u.getRol() != RolUsuario.ADMIN && (o.getTecnico() == null || !o.getTecnico().getId().equals(u.getId())))
            throw new org.springframework.security.access.AccessDeniedException("No es tu visita");

        LinkedHashMap<Long, Equipo> equipos = new LinkedHashMap<>();
        if (o.getEquiposSerie() != null && !o.getEquiposSerie().isBlank()) {
            for (String serie : o.getEquiposSerie().split("[,;\\s]+")) {
                if (serie.isBlank()) continue;
                Equipo e = buscarExacto(serie.trim());
                if (e != null) equipos.putIfAbsent(e.getId(), e);
            }
        }
        if (equipos.isEmpty() && o.getPresupuestoId() != null) {
            Servicio p = em.find(Servicio.class, o.getPresupuestoId());
            if (p != null) for (ServicioItem it : p.getItems())
                if (it.getEquipo() != null) equipos.putIfAbsent(it.getEquipo().getId(), it.getEquipo());
        }
        if (equipos.isEmpty() && o.getClienteId() != null) {
            em.createQuery("select e from Equipo e where e.sede.cliente.id = :cid and e.sede.activa = true", Equipo.class)
                .setParameter("cid", o.getClienteId()).setMaxResults(10).getResultList()
                .forEach(e -> equipos.putIfAbsent(e.getId(), e));
        }

        List<Map<String, Object>> out = new ArrayList<>();
        for (Equipo e : equipos.values()) {
            Map<String, Object> m = new LinkedHashMap<>(datosEquipo(e));
            List<Map<String, Object>> hist = historial(e, 3);
            m.put("visitas", hist);
            m.put("garantiaHasta", hist.stream().map(v -> v.get("garantiaHasta")).filter(Objects::nonNull).findFirst().orElse(null));
            out.add(m);
        }
        return out;
    }
}