package com.dispenserlatienda.controller.servicio;

import com.dispenserlatienda.dto.servicio.EstadisticasMensualDTO;
import com.dispenserlatienda.dto.servicio.ServicioCreateDTO;
import com.dispenserlatienda.dto.servicio.ServicioDTO;
import com.dispenserlatienda.dto.servicio.ServicioResumenDTO;
import com.dispenserlatienda.dto.servicio.SueldoProgressDTO;
import com.dispenserlatienda.dto.servicio.TecnicoRendimientoDTO;
import com.dispenserlatienda.dto.servicio.TecnicoResumenMesDTO;
import java.util.List;
import com.dispenserlatienda.domain.servicio.Servicio;
import com.dispenserlatienda.domain.usuario.RolUsuario;
import com.dispenserlatienda.domain.usuario.Usuario;
import com.dispenserlatienda.exception.ResourceNotFoundException;
import com.dispenserlatienda.repository.orden.OrdenVisitaRepository;
import com.dispenserlatienda.repository.servicio.ServicioRepository;
import com.dispenserlatienda.repository.usuario.UsuarioRepository;
import com.dispenserlatienda.service.servicio.ServicioService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;

/**
 * ServicioController
 * Gestiona servicios y presupuestos
 */
@RestController
@RequestMapping("/api/servicios")
@Validated
public class ServicioController {
    private final ServicioService servicioService;
    private final ServicioRepository servicioRepository;
    private final UsuarioRepository usuarioRepository;
    private final OrdenVisitaRepository ordenVisitaRepository;

    public ServicioController(ServicioService servicioService,
                              ServicioRepository servicioRepository,
                              UsuarioRepository usuarioRepository,
                              OrdenVisitaRepository ordenVisitaRepository) {
        this.servicioService = servicioService;
        this.servicioRepository = servicioRepository;
        this.usuarioRepository = usuarioRepository;
        this.ordenVisitaRepository = ordenVisitaRepository;
    }

    // GET: Listar servicios con filtros opcionales (tipo, estado, busqueda, desde, hasta, usuarioId, clienteId)
    @GetMapping
    public ResponseEntity<Page<ServicioDTO>> listar(
            @RequestParam(required = false) String tipo,
            @RequestParam(required = false) String estado,
            @RequestParam(required = false) String busqueda,
            @RequestParam(required = false) String desde,
            @RequestParam(required = false) String hasta,
            @RequestParam(required = false) Long usuarioId,
            @RequestParam(required = false) Long clienteId,
            Pageable pageable,
            Authentication auth) {
        // Un técnico solo ve sus propios servicios, mande lo que mande el frontend.
        Usuario solicitante = resolverUsuario(auth);
        if (solicitante.getRol() != RolUsuario.ADMIN) {
            usuarioId = solicitante.getId();
            // Al técnico no le viajan costos internos (4-oct-2026)
            return ResponseEntity.ok(servicioService.listarFiltrado(tipo, estado, busqueda, desde, hasta, usuarioId, clienteId, pageable)
                    .map(servicioService::sinCostos));
        }
        return ResponseEntity.ok(servicioService.listarFiltrado(tipo, estado, busqueda, desde, hasta, usuarioId, clienteId, pageable));
    }

    // GET: Stats resumen (totalMes, hoy, pendientes, ganancia MO). Solo el admin ve los
    // números (2-oct-2026): antes cualquier técnico podía pedir la facturación y la
    // ganancia del mes. Al técnico se le devuelve todo en 0 (su menú no usa estos valores).
    @GetMapping("/resumen")
    public ResponseEntity<ServicioResumenDTO> resumen(
            @RequestParam(required = false) String tipo, Authentication auth) {
        if (resolverUsuario(auth).getRol() != RolUsuario.ADMIN) {
            return ResponseEntity.ok(new ServicioResumenDTO(0, 0, 0, 0, 0, 0, 0));
        }
        return ResponseEntity.ok(servicioService.calcularResumen(tipo));
    }

    // GET: Obtener servicio por ID
    @GetMapping("/{id}")
    public ResponseEntity<ServicioDTO> obtenerPorId(@PathVariable Long id, Authentication auth) {
        verificarAccesoServicio(id, auth);
        ServicioDTO dto = servicioService.buscarPorId(id);
        return ResponseEntity.ok(esAdmin(auth) ? dto : servicioService.sinCostos(dto));
    }

    // POST: Crear servicio (JSON puro, sin FormData).
    // Técnico (4-oct-2026): solo al cerrar una visita suya, a su nombre, sin
    // costos ni precios de repuestos inventados, y sin pasos del admin.
    @PostMapping
    public ResponseEntity<ServicioDTO> crear(@Valid @RequestBody ServicioCreateDTO dto, Authentication auth) {
        Usuario solicitante = resolverUsuario(auth);
        if (solicitante.getRol() != RolUsuario.ADMIN) {
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(servicioService.sinCostos(servicioService.crearComoTecnico(dto, solicitante)));
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(servicioService.crearServicioCompleto(dto));
    }

    // PUT: Actualizar servicio (JSON puro, sin FormData).
    // Técnico: solo los suyos o los que le asignaron por orden; precios, costos
    // y descuento quedan como estaban; solo COMPLETADO o COBRADO en efectivo.
    @PutMapping("/{id}")
    public ResponseEntity<ServicioDTO> actualizar(
            @PathVariable Long id,
            @Valid @RequestBody ServicioCreateDTO dto,
            Authentication auth) {
        Usuario solicitante = resolverUsuario(auth);
        if (solicitante.getRol() != RolUsuario.ADMIN) {
            if (!servicioService.tecnicoPuedeTocar(id, solicitante.getId()))
                throw new AccessDeniedException("No podés modificar este trabajo");
            return ResponseEntity.ok(servicioService.sinCostos(servicioService.actualizarComoTecnico(id, dto, solicitante)));
        }
        return ResponseEntity.ok(servicioService.actualizarServicio(id, dto));
    }

    // PATCH: Cambiar estado (acepta modalidadCobro y montoFinal opcionales)
    @PatchMapping("/{id}/estado")
    public ResponseEntity<ServicioDTO> cambiarEstado(
            @PathVariable Long id,
            @RequestBody java.util.Map<String, Object> payload,
            Authentication auth) {
        verificarAccesoServicio(id, auth);
        String nuevoEstado = (String) payload.get("estado");
        String modalidadCobro = (String) payload.get("modalidadCobro");
        // Técnico: solo COMPLETADO o COBRADO en efectivo (facturar, archivar, cancelar = admin)
        if (!esAdmin(auth)) servicioService.validarEstadoTecnico(nuevoEstado, modalidadCobro);
        java.math.BigDecimal montoFinal = null;
        if (payload.get("montoFinal") != null) {
            montoFinal = new java.math.BigDecimal(payload.get("montoFinal").toString());
        }
        String observaciones = (String) payload.get("observaciones");
        return ResponseEntity.ok(servicioService.cambiarEstado(id, nuevoEstado, modalidadCobro, montoFinal, observaciones));
    }

    // PATCH: poner/sacar "en espera" (body: {enEspera: true|false}) — solo admin
    @PatchMapping("/{id}/espera")
    public ResponseEntity<ServicioDTO> espera(
            @PathVariable Long id,
            @RequestBody java.util.Map<String, Object> payload,
            Authentication auth) {
        if (resolverUsuario(auth).getRol() != RolUsuario.ADMIN) {
            throw new AccessDeniedException("Solo el admin puede poner un presupuesto en espera");
        }
        boolean enEspera = Boolean.TRUE.equals(payload.get("enEspera"));
        return ResponseEntity.ok(servicioService.marcarEnEspera(id, enEspera));
    }

    // PATCH: el tecnico asignado confirma dia/hora exactos dentro de la
    // disponibilidad tentativa que dejo el admin (body: {fecha, hora})
    @PatchMapping("/{id}/confirmar-horario")
    public ResponseEntity<ServicioDTO> confirmarHorario(
            @PathVariable Long id,
            @RequestBody java.util.Map<String, String> payload,
            Authentication auth) {
        verificarAccesoServicio(id, auth);
        return ResponseEntity.ok(servicioService.confirmarHorario(id, payload.get("fecha"), payload.get("hora")));
    }

    // PATCH: Guardar número de documento generado al crear el PDF
    @PatchMapping("/{id}/nro-doc")
    public ResponseEntity<Void> guardarNroDoc(
            @PathVariable Long id,
            @RequestBody java.util.Map<String, String> payload,
            Authentication auth) {
        verificarAccesoServicio(id, auth);
        servicioService.guardarNroDocumento(id, payload.get("nroDocumento"));
        return ResponseEntity.noContent().build();
    }

    // DELETE: Eliminar servicio
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @org.springframework.transaction.annotation.Transactional
    public void eliminar(@PathVariable Long id) {
        // Sus visitas se van con él, así no quedan en la agenda sin trabajo (5-oct-2026)
        ordenVisitaRepository.borrarDePresupuesto(id);
        servicioRepository.deleteById(id);
    }

    // GET: Estadísticas mensuales para análisis financiero
    @GetMapping("/stats/mensual")
    public ResponseEntity<EstadisticasMensualDTO> estadisticasMensual(
            @RequestParam String mes) {
        // Format esperado: mes=2026-03
        return ResponseEntity.ok(servicioService.calcularEstadisticasMensual(mes));
    }

    // GET: Rendimiento mensual del técnico (solo meses cerrados, sin info de clientes)
    // Antes cualquier tecnico autenticado podia ver el rendimiento de otro
    // con solo cambiar el tecnicoId en la URL (no habia chequeo de dueño).
    // Mismo patron que verificarAccesoServicio. Hallazgo Alto #12, auditoria 1-sep.
    @GetMapping("/tecnico/{tecnicoId}/rendimiento")
    public ResponseEntity<List<TecnicoRendimientoDTO>> rendimientoTecnico(@PathVariable Long tecnicoId, Authentication auth) {
        verificarAccesoTecnico(tecnicoId, auth);
        return ResponseEntity.ok(servicioService.rendimientoTecnico(tecnicoId));
    }

    // GET: Rendimiento del mes actual — todos los técnicos — vista admin.
    // Un técnico solo puede ver el suyo (antes veía el de todos, 4-oct-2026).
    @GetMapping("/rendimiento/mes-actual")
    public ResponseEntity<List<TecnicoResumenMesDTO>> rendimientoMesActual(
            @RequestParam(required = false) String mes,
            @RequestParam(required = false) Long tecnicoId,
            Authentication auth) {
        Usuario solicitante = resolverUsuario(auth);
        if (solicitante.getRol() != RolUsuario.ADMIN) tecnicoId = solicitante.getId();
        return ResponseEntity.ok(servicioService.rendimientoMesActual(mes, tecnicoId));
    }

    // GET: Liquidación mensual del técnico/socio (desglose por trabajo).
    // Admin elige el técnico; un técnico siempre ve la suya.
    @GetMapping("/liquidacion")
    public ResponseEntity<com.dispenserlatienda.dto.servicio.LiquidacionDTO> liquidacion(
            @RequestParam(required = false) String mes,
            @RequestParam(required = false) Long tecnicoId,
            Authentication auth) {
        Usuario solicitante = resolverUsuario(auth);
        Long id = (solicitante.getRol() == RolUsuario.ADMIN && tecnicoId != null) ? tecnicoId : solicitante.getId();
        return ResponseEntity.ok(servicioService.liquidacion(id, mes));
    }

    // GET: Progreso de sueldo mensual — admin ve todo, técnico ve su parte.
    // isAdmin ya NO viene del cliente (antes era un boolean spoofeable): se
    // deriva del usuario autenticado. Un técnico solo puede consultar su
    // propio usuarioId; un admin puede consultar el de cualquiera, pero solo
    // ve la vista agregada (isAdmin=true) cuando consulta su propio id,
    // igual que hacía el frontend hasta ahora.
    @GetMapping("/stats/sueldo")
    public ResponseEntity<SueldoProgressDTO> progresoSueldo(
            @RequestParam Long usuarioId,
            @RequestParam(required = false) String mes,
            Authentication auth) {
        Usuario solicitante = resolverUsuario(auth);
        boolean esAdminSolicitante = solicitante.getRol() == RolUsuario.ADMIN;
        if (!esAdminSolicitante && !solicitante.getId().equals(usuarioId)) {
            throw new AccessDeniedException("No podés ver el sueldo de otro usuario");
        }
        boolean isAdmin = esAdminSolicitante && solicitante.getId().equals(usuarioId);
        return ResponseEntity.ok(servicioService.calcularProgresoSueldo(usuarioId, mes, isAdmin));
    }

    private Usuario resolverUsuario(Authentication auth) {
        String username = auth.getName();
        return usuarioRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalStateException("Usuario no encontrado: " + username));
    }

    // Antes cualquier técnico autenticado podía leer/cambiar el estado/
    // confirmar el horario de un servicio ajeno con solo adivinar el id
    // (no había ningún chequeo de dueño). Admin no tiene restricción; un
    // técnico solo puede acceder a los servicios que tiene asignados.
    private void verificarAccesoServicio(Long servicioId, Authentication auth) {
        Usuario solicitante = resolverUsuario(auth);
        if (solicitante.getRol() == RolUsuario.ADMIN) return;
        servicioRepository.findById(servicioId)
                .orElseThrow(() -> new ResourceNotFoundException("Servicio no encontrado con ID: " + servicioId));
        // Suyo, o asignado por una orden (4-oct-2026: antes el presupuesto asignado
        // por orden quedaba a nombre del admin y el técnico no lo podía abrir)
        if (!servicioService.tecnicoPuedeTocar(servicioId, solicitante.getId())) {
            throw new AccessDeniedException("No podés acceder a este servicio");
        }
    }

    private boolean esAdmin(Authentication auth) {
        return resolverUsuario(auth).getRol() == RolUsuario.ADMIN;
    }

    private void verificarAccesoTecnico(Long tecnicoId, Authentication auth) {
        Usuario solicitante = resolverUsuario(auth);
        if (solicitante.getRol() == RolUsuario.ADMIN) return;
        if (!solicitante.getId().equals(tecnicoId)) {
            throw new AccessDeniedException("No podés ver el rendimiento de otro técnico");
        }
    }
}