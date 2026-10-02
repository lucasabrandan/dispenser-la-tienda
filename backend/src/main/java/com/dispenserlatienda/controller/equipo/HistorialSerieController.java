package com.dispenserlatienda.controller.equipo;

import com.dispenserlatienda.domain.equipo.Equipo;
import com.dispenserlatienda.domain.sede.Sede;
import com.dispenserlatienda.domain.servicio.EstadoServicio;
import com.dispenserlatienda.domain.servicio.Servicio;
import com.dispenserlatienda.domain.servicio.ServicioItem;
import com.dispenserlatienda.repository.equipo.EquipoRepository;
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
 * Sin montos — por eso lo puede ver cualquier usuario logueado.
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

    public HistorialSerieController(EquipoRepository equipoRepository, ObjectMapper objectMapper) {
        this.equipoRepository = equipoRepository;
        this.objectMapper = objectMapper;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public Map<String, Object> porSerie(@RequestParam String serie) {
        String s = serie == null ? "" : serie.trim();
        if (s.isEmpty()) throw new IllegalArgumentException("Falta el N° de serie");

        Map<String, Object> out = new LinkedHashMap<>();
        Equipo e = equipoRepository.findFirstByNumeroSerie(s).orElse(null);
        if (e == null) {
            // Segundo intento sin distinguir mayúsculas
            List<Equipo> parecidos = equipoRepository.findByNumeroSerieContainingIgnoreCase(s,
                org.springframework.data.domain.PageRequest.of(0, 5));
            e = parecidos.stream().filter(x -> s.equalsIgnoreCase(x.getNumeroSerie())).findFirst().orElse(null);
            if (e == null) {
                out.put("encontrado", false);
                out.put("sugerencias", parecidos.stream().map(Equipo::getNumeroSerie).toList());
                return out;
            }
        }

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
        out.put("encontrado", true);
        out.put("equipo", eq);

        List<Object[]> res = em.createQuery(
            "select s, i from Servicio s join s.items i where i.equipo.id = :eid and s.estado in :estados " +
            "order by s.fechaServicio desc, s.id desc", Object[].class)
            .setParameter("eid", e.getId())
            .setParameter("estados", HECHOS)
            .setMaxResults(20)
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
        out.put("visitas", visitas);
        return out;
    }
}
