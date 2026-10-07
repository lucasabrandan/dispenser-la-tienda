package com.dispenserlatienda.service.seguridad;

import com.dispenserlatienda.domain.orden.EstadoOrden;
import com.dispenserlatienda.domain.sede.Sede;
import com.dispenserlatienda.domain.usuario.RolUsuario;
import com.dispenserlatienda.domain.usuario.Usuario;
import com.dispenserlatienda.repository.sede.SedeRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

// Seguridad del técnico (7-oct-2026, testeo integral C2): un técnico solo ve y
// toca datos de los clientes a los que tiene una visita ABIERTA asignada
// (pendiente, en camino o en el lugar). Antes podía recorrer todos los clientes,
// mover equipos entre clientes y crear sedes en cualquiera.
@Service
public class TecnicoAccesoService {

    public static final List<EstadoOrden> ABIERTAS = List.of(EstadoOrden.PENDIENTE, EstadoOrden.EN_CAMINO, EstadoOrden.EN_SITIO);

    @PersistenceContext
    private EntityManager em;
    private final SedeRepository sedeRepo;

    public TecnicoAccesoService(SedeRepository sedeRepo) {
        this.sedeRepo = sedeRepo;
    }

    public static boolean esAdmin(Usuario u) {
        return u != null && u.getRol() == RolUsuario.ADMIN;
    }

    // ¿El técnico tiene una visita abierta de este cliente? (directa o por el presupuesto)
    @Transactional(readOnly = true)
    public boolean tieneCliente(Long tecnicoId, Long clienteId) {
        if (tecnicoId == null || clienteId == null) return false;
        Long n = em.createQuery(
                "select count(o) from OrdenVisita o where o.tecnico.id = :t and o.estado in :ab and " +
                "(o.clienteId = :c or o.presupuestoId in (select s.id from Servicio s where s.sede.cliente.id = :c))", Long.class)
            .setParameter("t", tecnicoId).setParameter("ab", ABIERTAS).setParameter("c", clienteId)
            .getSingleResult();
        return n != null && n > 0;
    }

    public void exigirCliente(Usuario u, Long clienteId) {
        if (esAdmin(u)) return;
        if (!tieneCliente(u.getId(), clienteId)) throw new AccessDeniedException("Solo datos de clientes de tus visitas abiertas");
    }

    // Sede: permitida si es "mostrador" o de un cliente de sus visitas abiertas
    @Transactional(readOnly = true)
    public void exigirSede(Usuario u, Long sedeId) {
        if (esAdmin(u)) return;
        Sede s = sedeId == null ? null : sedeRepo.findById(sedeId).orElse(null);
        if (s == null) throw new AccessDeniedException("Lugar inexistente");
        if (esMostrador(s)) return;
        if (s.getCliente() == null || !tieneCliente(u.getId(), s.getCliente().getId()))
            throw new AccessDeniedException("Ese lugar no es de un cliente de tus visitas");
    }

    public static boolean esMostrador(Sede s) {
        return s != null && s.getNombreSede() != null && s.getNombreSede().toLowerCase().contains("mostrador");
    }
}
