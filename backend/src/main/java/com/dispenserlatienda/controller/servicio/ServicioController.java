package com.dispenserlatienda.controller.servicio;

import com.dispenserlatienda.dto.servicio.EstadisticasMensualDTO;
import com.dispenserlatienda.dto.servicio.ServicioCreateDTO;
import com.dispenserlatienda.dto.servicio.ServicioDTO;
import com.dispenserlatienda.dto.servicio.ServicioResumenDTO;
import com.dispenserlatienda.dto.servicio.TecnicoRendimientoDTO;
import com.dispenserlatienda.dto.servicio.TecnicoResumenMesDTO;
import java.util.List;
import com.dispenserlatienda.repository.servicio.ServicioRepository;
import com.dispenserlatienda.service.servicio.ServicioService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
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

    public ServicioController(ServicioService servicioService,
                              ServicioRepository servicioRepository) {
        this.servicioService = servicioService;
        this.servicioRepository = servicioRepository;
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
            Pageable pageable) {
        return ResponseEntity.ok(servicioService.listarFiltrado(tipo, estado, busqueda, desde, hasta, usuarioId, clienteId, pageable));
    }

    // GET: Stats resumen (totalMes, hoy, pendientes, ganancia MO) — accesible a todos los roles
    @GetMapping("/resumen")
    public ResponseEntity<ServicioResumenDTO> resumen(
            @RequestParam(required = false) String tipo) {
        return ResponseEntity.ok(servicioService.calcularResumen(tipo));
    }

    // GET: Obtener servicio por ID
    @GetMapping("/{id}")
    public ResponseEntity<ServicioDTO> obtenerPorId(@PathVariable Long id) {
        return ResponseEntity.ok(servicioService.buscarPorId(id));
    }

    // POST: Crear servicio (JSON puro, sin FormData)
    @PostMapping
    public ResponseEntity<ServicioDTO> crear(@Valid @RequestBody ServicioCreateDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(servicioService.crearServicioCompleto(dto));
    }

    // PUT: Actualizar servicio (JSON puro, sin FormData)
    @PutMapping("/{id}")
    public ResponseEntity<ServicioDTO> actualizar(
            @PathVariable Long id,
            @Valid @RequestBody ServicioCreateDTO dto) {
        return ResponseEntity.ok(servicioService.actualizarServicio(id, dto));
    }

    // PATCH: Cambiar estado (acepta modalidadCobro y montoFinal opcionales)
    @PatchMapping("/{id}/estado")
    public ResponseEntity<ServicioDTO> cambiarEstado(
            @PathVariable Long id,
            @RequestBody java.util.Map<String, Object> payload) {
        String nuevoEstado = (String) payload.get("estado");
        String modalidadCobro = (String) payload.get("modalidadCobro");
        java.math.BigDecimal montoFinal = null;
        if (payload.get("montoFinal") != null) {
            montoFinal = new java.math.BigDecimal(payload.get("montoFinal").toString());
        }
        return ResponseEntity.ok(servicioService.cambiarEstado(id, nuevoEstado, modalidadCobro, montoFinal));
    }

    // PATCH: Guardar número de documento generado al crear el PDF
    @PatchMapping("/{id}/nro-doc")
    public ResponseEntity<Void> guardarNroDoc(
            @PathVariable Long id,
            @RequestBody java.util.Map<String, String> payload) {
        servicioService.guardarNroDocumento(id, payload.get("nroDocumento"));
        return ResponseEntity.noContent().build();
    }

    // DELETE: Eliminar servicio
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void eliminar(@PathVariable Long id) {
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
    @GetMapping("/tecnico/{tecnicoId}/rendimiento")
    public ResponseEntity<List<TecnicoRendimientoDTO>> rendimientoTecnico(@PathVariable Long tecnicoId) {
        return ResponseEntity.ok(servicioService.rendimientoTecnico(tecnicoId));
    }

    // GET: Rendimiento del mes actual — todos los técnicos — vista admin
    @GetMapping("/rendimiento/mes-actual")
    public ResponseEntity<List<TecnicoResumenMesDTO>> rendimientoMesActual(
            @RequestParam(required = false) String mes,
            @RequestParam(required = false) Long tecnicoId) {
        return ResponseEntity.ok(servicioService.rendimientoMesActual(mes, tecnicoId));
    }
}