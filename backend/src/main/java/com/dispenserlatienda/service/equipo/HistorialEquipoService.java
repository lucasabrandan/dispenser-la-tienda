package com.dispenserlatienda.service.equipo;

import com.dispenserlatienda.domain.equipo.Equipo;
import com.dispenserlatienda.domain.sede.Sede;
import com.dispenserlatienda.domain.servicio.EstadoServicio;
import com.dispenserlatienda.domain.servicio.Servicio;
import com.dispenserlatienda.domain.servicio.ServicioItem;
import com.dispenserlatienda.exception.ResourceNotFoundException;
import com.dispenserlatienda.repository.servicio.ServicioRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.*;

// Portal Empresa — etapa 2 (7-oct-2026): informe de una visita y ficha
// permanente de cada equipo, para que la empresa los vea. SIN montos ni datos
// internos: solo qué se hizo, repuestos (nombre y cantidad), fotos, técnico
// (nombre de pila) y garantía.
@Service
public class HistorialEquipoService {

    private static final List<EstadoServicio> HECHOS = List.of(
        EstadoServicio.COMPLETADO, EstadoServicio.PENDIENTE_FACTURACION,
        EstadoServicio.FACTURADO, EstadoServicio.COBRADO, EstadoServicio.REALIZADO);

    @PersistenceContext
    private EntityManager em;
    private final ServicioRepository servicioRepo;
    private final ObjectMapper objectMapper;

    public HistorialEquipoService(ServicioRepository servicioRepo, ObjectMapper objectMapper) {
        this.servicioRepo = servicioRepo;
        this.objectMapper = objectMapper;
    }

    // Lo que se hizo en una visita (todos los equipos), para el informe del pedido
    @Transactional(readOnly = true)
    public List<Map<String, Object>> informeDeOrden(Long ordenId) {
        List<Map<String, Object>> out = new ArrayList<>();
        if (ordenId == null) return out;
        for (Servicio s : servicioRepo.findByOrdenId(ordenId)) {
            if (s.getEstado() == EstadoServicio.CANCELADO || s.getEstado() == EstadoServicio.ARCHIVADO) continue;
            for (ServicioItem it : s.getItems()) out.add(itemAMapa(s, it));
        }
        return out;
    }

    // Resumen corto para el aviso de "terminado"
    @Transactional(readOnly = true)
    public String resumenDeOrden(Long ordenId) {
        return informeDeOrden(ordenId).stream()
            .map(m -> (String) m.get("trabajo")).filter(t -> t != null && !t.isBlank())
            .findFirst().orElse(null);
    }

    // Todos los equipos de un cliente con la fecha de su última visita
    @Transactional(readOnly = true)
    public List<Map<String, Object>> equiposDeCliente(Long clienteId) {
        List<Equipo> equipos = em.createQuery(
                "select e from Equipo e where e.sede.cliente.id = :cid and e.sede.activa = true order by e.sede.nombreSede, e.numeroSerie", Equipo.class)
            .setParameter("cid", clienteId).getResultList();
        Map<Long, LocalDate> ultima = new HashMap<>();
        List<Object[]> filas = em.createQuery(
                "select i.equipo.id, max(s.fechaServicio) from Servicio s join s.items i " +
                "where i.equipo.sede.cliente.id = :cid and s.estado in :estados group by i.equipo.id", Object[].class)
            .setParameter("cid", clienteId).setParameter("estados", HECHOS).getResultList();
        for (Object[] f : filas) ultima.put((Long) f[0], (LocalDate) f[1]);
        List<Map<String, Object>> out = new ArrayList<>();
        for (Equipo e : equipos) {
            if (e.getNumeroSerie() == null || e.getNumeroSerie().isBlank()) continue;
            Map<String, Object> m = datosEquipo(e);
            m.put("ultimaVisita", ultima.get(e.getId()));
            out.add(m);
        }
        return out;
    }

    // Ficha de un equipo del cliente: datos + todas las visitas (con fotos)
    @Transactional(readOnly = true)
    public Map<String, Object> fichaDeCliente(Long clienteId, String serie) {
        String s = Equipo.normalizarSerie(serie);
        if (s == null || s.isBlank()) throw new ResourceNotFoundException("Equipo no encontrado");
        List<Equipo> lista = em.createQuery(
                "select e from Equipo e where e.sede.cliente.id = :cid and upper(e.numeroSerie) = :s", Equipo.class)
            .setParameter("cid", clienteId).setParameter("s", s.toUpperCase()).setMaxResults(1).getResultList();
        if (lista.isEmpty()) throw new ResourceNotFoundException("Equipo no encontrado");
        Equipo e = lista.get(0);
        Map<String, Object> out = datosEquipo(e);
        List<Map<String, Object>> visitas = historial(e, 200);
        out.put("visitas", visitas);
        out.put("garantiaHasta", visitas.stream().map(v -> v.get("garantiaHasta")).filter(Objects::nonNull).findFirst().orElse(null));
        return out;
    }

    // Resumen del mes para la empresa (7-oct-2026): cada equipo atendido, sin precios
    @Transactional(readOnly = true)
    public Map<String, Object> resumenMes(Long clienteId, java.time.YearMonth mes) {
        LocalDate desde = mes.atDay(1), hasta = mes.atEndOfMonth();
        List<Object[]> res = em.createQuery(
                "select s, i from Servicio s join s.items i where s.sede.cliente.id = :cid " +
                "and s.fechaServicio between :d and :h and s.estado in :estados order by s.fechaServicio, s.id", Object[].class)
            .setParameter("cid", clienteId).setParameter("d", desde).setParameter("h", hasta)
            .setParameter("estados", HECHOS).getResultList();
        List<Map<String, Object>> items = new ArrayList<>();
        Set<Long> visitas = new HashSet<>();
        Set<String> series = new HashSet<>();
        Set<Long> lugares = new HashSet<>();
        for (Object[] r : res) {
            Servicio s = (Servicio) r[0];
            ServicioItem it = (ServicioItem) r[1];
            Map<String, Object> m = itemAMapa(s, it);
            m.remove("fotoAntes"); m.remove("fotoDespues");
            m.put("lugar", s.getSede() != null ? s.getSede().getNombreSede() : s.getSedeNombre());
            m.put("direccion", s.getSede() != null ? s.getSede().getDireccion() : null);
            items.add(m);
            visitas.add(s.getId());
            if (m.get("serie") != null) series.add((String) m.get("serie"));
            if (s.getSede() != null) lugares.add(s.getSede().getId());
        }
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("mes", mes.toString());
        out.put("equiposAtendidos", items.size());
        out.put("equiposDistintos", series.size());
        out.put("visitas", visitas.size());
        out.put("lugares", lugares.size());
        out.put("items", items);
        return out;
    }

    private List<Map<String, Object>> historial(Equipo e, int max) {
        List<Object[]> res = em.createQuery(
                "select s, i from Servicio s join s.items i where i.equipo.id = :eid and s.estado in :estados " +
                "order by s.fechaServicio desc, s.id desc", Object[].class)
            .setParameter("eid", e.getId()).setParameter("estados", HECHOS)
            .setMaxResults(max).getResultList();
        List<Map<String, Object>> out = new ArrayList<>();
        for (Object[] r : res) out.add(itemAMapa((Servicio) r[0], (ServicioItem) r[1]));
        return out;
    }

    private Map<String, Object> datosEquipo(Equipo e) {
        Sede sede = e.getSede();
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("serie", e.getNumeroSerie());
        m.put("marca", e.getMarca());
        m.put("modelo", e.getModelo());
        m.put("ubicacion", e.getUbicacion());
        m.put("sedeId", sede != null ? sede.getId() : null);
        m.put("sede", sede != null ? sede.getNombreSede() : null);
        m.put("direccion", sede != null ? sede.getDireccion() : null);
        return m;
    }

    private Map<String, Object> itemAMapa(Servicio s, ServicioItem it) {
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
        String tecnico = it.getTecnico() != null ? it.getTecnico() : (s.getUsuario() != null ? s.getUsuario().getNombre() : null);
        Map<String, Object> v = new LinkedHashMap<>();
        v.put("fecha", s.getFechaServicio());
        v.put("serie", it.getEquipo() != null ? it.getEquipo().getNumeroSerie() : null);
        v.put("trabajo", it.getTrabajoRealizado());
        v.put("tecnico", tecnico != null ? tecnico.trim().split(" ")[0] : null);
        v.put("garantiaHasta", it.getGarantiaHasta());
        v.put("repuestos", reps);
        v.put("fotoAntes", it.getFotoAntes());
        v.put("fotoDespues", it.getFotoDespues());
        return v;
    }
}
