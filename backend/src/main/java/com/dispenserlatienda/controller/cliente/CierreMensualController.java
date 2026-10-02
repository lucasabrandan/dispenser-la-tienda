package com.dispenserlatienda.controller.cliente;

import com.dispenserlatienda.domain.cliente.Cliente;
import com.dispenserlatienda.domain.equipo.Equipo;
import com.dispenserlatienda.domain.sede.Sede;
import com.dispenserlatienda.domain.servicio.EstadoServicio;
import com.dispenserlatienda.domain.servicio.Servicio;
import com.dispenserlatienda.domain.servicio.ServicioItem;
import com.dispenserlatienda.domain.servicio.ServicioTipo;
import com.dispenserlatienda.repository.cliente.ClienteRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import com.dispenserlatienda.exception.ResourceNotFoundException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.*;

/**
 * Cierre mensual por cliente con tarifa por volumen (2-oct-2026, pensado para MODO AGUA).
 * El cliente tiene tramos de precio por equipo según cuántos equipos se le atendieron en
 * el mes; el tramo se aplica a TODOS los equipos del mes. El cierre cuenta los equipos
 * (ítems de servicio) de ese cliente — por el cliente del EQUIPO, no de la sede del
 * servicio — en servicios ya realizados del mes, y arma la planilla + totales.
 * Repuestos: se guardan con precio final (IVA incluido) → acá se discrimina el IVA.
 */
@RestController
@RequestMapping("/api/clientes/{id}")
public class CierreMensualController {

    private static final BigDecimal IVA = new BigDecimal("0.21");
    private static final List<EstadoServicio> REALIZADOS = List.of(
        EstadoServicio.COMPLETADO, EstadoServicio.PENDIENTE_FACTURACION,
        EstadoServicio.FACTURADO, EstadoServicio.COBRADO, EstadoServicio.REALIZADO);

    @PersistenceContext
    private EntityManager em;
    private final ClienteRepository clienteRepository;
    private final ObjectMapper objectMapper;

    public CierreMensualController(ClienteRepository clienteRepository, ObjectMapper objectMapper) {
        this.clienteRepository = clienteRepository;
        this.objectMapper = objectMapper;
    }

    public record Tramo(int desde, BigDecimal precio) {}

    private void soloAdmin(Authentication auth) {
        boolean admin = auth != null && auth.getAuthorities().stream()
            .anyMatch(a -> "ROLE_ADMIN".equals(a.getAuthority()));
        if (!admin) throw new AccessDeniedException("Solo admin");
    }

    private Cliente cliente(Long id) {
        return clienteRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Cliente no encontrado"));
    }

    private List<Tramo> leerTramos(Cliente c) {
        if (c.getTarifaVolumen() == null || c.getTarifaVolumen().isBlank()) return List.of();
        try {
            List<Tramo> t = new ArrayList<>(objectMapper.readValue(c.getTarifaVolumen(), new TypeReference<List<Tramo>>() {}));
            t.sort(Comparator.comparingInt(Tramo::desde));
            return t;
        } catch (Exception e) {
            return List.of();
        }
    }

    @GetMapping("/tarifa-volumen")
    public List<Tramo> getTarifa(@PathVariable Long id, Authentication auth) {
        soloAdmin(auth);
        return leerTramos(cliente(id));
    }

    @PutMapping("/tarifa-volumen")
    @Transactional
    public List<Tramo> setTarifa(@PathVariable Long id, @RequestBody List<Tramo> tramos, Authentication auth) throws Exception {
        soloAdmin(auth);
        Cliente c = cliente(id);
        List<Tramo> limpios = new ArrayList<>();
        Set<Integer> vistos = new HashSet<>();
        for (Tramo t : tramos == null ? List.<Tramo>of() : tramos) {
            if (t == null || t.precio() == null || t.precio().signum() <= 0 || t.desde() < 0) continue;
            if (vistos.add(t.desde())) limpios.add(t);
        }
        limpios.sort(Comparator.comparingInt(Tramo::desde));
        c.setTarifaVolumen(limpios.isEmpty() ? null : objectMapper.writeValueAsString(limpios));
        clienteRepository.save(c);
        return limpios;
    }

    @GetMapping("/cierre-mensual")
    @Transactional(readOnly = true)
    public Map<String, Object> cierre(@PathVariable Long id, @RequestParam String mes, Authentication auth) {
        soloAdmin(auth);
        Cliente c = cliente(id);
        YearMonth ym;
        try { ym = YearMonth.parse(mes); }
        catch (Exception e) { throw new IllegalArgumentException("mes debe ser AAAA-MM"); }
        LocalDate desde = ym.atDay(1), hasta = ym.atEndOfMonth();

        List<Object[]> res = em.createQuery(
            "select s, i from Servicio s join s.items i " +
            "left join i.equipo e left join e.sede es left join s.sede ss " +
            "where s.fechaServicio between :desde and :hasta " +
            "and s.estado in :estados and (s.servicioTipo is null or s.servicioTipo <> :venta) " +
            "and ((e is not null and es.cliente.id = :cid) or (e is null and ss.cliente.id = :cid)) " +
            "order by s.fechaServicio, s.id, i.id", Object[].class)
            .setParameter("desde", desde).setParameter("hasta", hasta)
            .setParameter("estados", REALIZADOS).setParameter("venta", ServicioTipo.VENTA)
            .setParameter("cid", id)
            .getResultList();

        List<Map<String, Object>> filas = new ArrayList<>();
        Set<Long> servicios = new HashSet<>();
        BigDecimal repuestosConIva = BigDecimal.ZERO;
        for (Object[] r : res) {
            Servicio s = (Servicio) r[0];
            ServicioItem it = (ServicioItem) r[1];
            servicios.add(s.getId());
            Equipo e = it.getEquipo();
            Sede sede = e != null ? e.getSede() : s.getSede();

            List<Map<String, Object>> reps = new ArrayList<>();
            BigDecimal repTotal = BigDecimal.ZERO;
            if (it.getRepuestosUsados() != null && !it.getRepuestosUsados().isBlank()) {
                try {
                    List<Map<String, Object>> crudos = objectMapper.readValue(it.getRepuestosUsados(), new TypeReference<>() {});
                    for (Map<String, Object> rp : crudos) {
                        BigDecimal cant = num(rp.get("cantidad"), BigDecimal.ONE);
                        BigDecimal sub = rp.get("subtotal") != null ? num(rp.get("subtotal"), BigDecimal.ZERO)
                            : num(rp.get("precio"), BigDecimal.ZERO).multiply(cant);
                        repTotal = repTotal.add(sub);
                        Map<String, Object> m = new LinkedHashMap<>();
                        m.put("nombre", rp.getOrDefault("nombre", "Repuesto"));
                        m.put("cantidad", cant);
                        m.put("subtotal", sub);
                        reps.add(m);
                    }
                } catch (Exception ignored) { /* JSON viejo/roto: se lista sin repuestos */ }
            }
            repuestosConIva = repuestosConIva.add(repTotal);

            Map<String, Object> f = new LinkedHashMap<>();
            f.put("fecha", s.getFechaServicio());
            f.put("servicioId", s.getId());
            f.put("nroDocumento", s.getNroDocumento());
            f.put("serie", e != null ? e.getNumeroSerie() : null);
            f.put("equipo", e != null ? String.join(" ", Objects.toString(e.getMarca(), ""), Objects.toString(e.getModelo(), "")).trim() : null);
            f.put("ubicacion", e != null ? e.getUbicacion() : null);
            f.put("sede", sede != null ? sede.getNombreSede() : null);
            f.put("direccion", sede != null ? (sede.getDireccion() != null ? sede.getDireccion()
                : String.join(" ", Objects.toString(sede.getCalle(), ""), Objects.toString(sede.getLocalidad(), "")).trim()) : null);
            f.put("trabajo", it.getTrabajoRealizado());
            f.put("tecnico", it.getTecnico());
            f.put("repuestos", reps);
            f.put("repuestosTotal", repTotal);
            filas.add(f);
        }

        int cantidad = filas.size();
        List<Tramo> tramos = leerTramos(c);
        Tramo tramo = null;
        for (Tramo t : tramos) if (cantidad >= t.desde()) tramo = t;

        BigDecimal precioUnit = tramo != null ? tramo.precio() : null;
        BigDecimal mo = precioUnit != null ? precioUnit.multiply(BigDecimal.valueOf(cantidad)) : BigDecimal.ZERO;
        BigDecimal repNeto = repuestosConIva.divide(BigDecimal.ONE.add(IVA), 2, RoundingMode.HALF_UP);
        BigDecimal subtotal = mo.add(repNeto);
        BigDecimal iva = subtotal.multiply(IVA).setScale(2, RoundingMode.HALF_UP);

        Map<String, Object> out = new LinkedHashMap<>();
        Map<String, Object> cli = new LinkedHashMap<>();
        cli.put("id", c.getId());
        cli.put("nombre", c.getNombre());
        cli.put("cuit", c.getCuilDni());
        cli.put("condicionIva", c.getCondicionIva());
        out.put("cliente", cli);
        out.put("mes", ym.toString());
        out.put("desde", desde);
        out.put("hasta", hasta);
        out.put("tramos", tramos);
        out.put("tramoAplicado", tramo);
        out.put("cantidadEquipos", cantidad);
        out.put("cantidadServicios", servicios.size());
        out.put("precioUnitario", precioUnit);
        out.put("manoDeObra", mo);
        out.put("repuestosConIva", repuestosConIva);
        out.put("repuestosNeto", repNeto);
        out.put("subtotal", subtotal);
        out.put("iva", iva);
        out.put("total", subtotal.add(iva));
        out.put("filas", filas);
        return out;
    }

    private static BigDecimal num(Object o, BigDecimal def) {
        if (o == null) return def;
        try { return new BigDecimal(o.toString().replace(",", ".")); } catch (Exception e) { return def; }
    }
}
