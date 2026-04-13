package com.dispenserlatienda.controller.venta;

import com.dispenserlatienda.dto.venta.VentaCreateDTO;
import com.dispenserlatienda.dto.venta.VentaDTO;
import com.dispenserlatienda.dto.venta.VentaItemDTO;
import com.dispenserlatienda.dto.venta.VentasEstadisticasDTO;
import com.dispenserlatienda.service.venta.VentaService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.Map;

/**
 * Controller para gestionar ventas.
 *
 * Endpoints:
 * POST   /api/ventas                    - Crear venta
 * GET    /api/ventas                    - Listar con filtros
 * GET    /api/ventas/{id}               - Obtener detalle
 * PUT    /api/ventas/{id}               - Actualizar venta
 * PUT    /api/ventas/{id}/items/{itemId} - Editar item
 * DELETE /api/ventas/{id}/items/{itemId} - Eliminar item
 * DELETE /api/ventas/{id}               - Eliminar venta
 * POST   /api/ventas/{id}/duplicar      - Duplicar venta
 * PATCH  /api/ventas/{id}/estado        - Cambiar estado
 * GET    /api/ventas/stats/periodo      - Estadísticas
 */
@RestController
@RequestMapping("/api/ventas")
public class VentaController {

    private final VentaService ventaService;

    public VentaController(VentaService ventaService) {
        this.ventaService = ventaService;
    }

    // ============ CREAR VENTA ============
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public VentaDTO crearVenta(@RequestBody VentaCreateDTO dto) {
        return ventaService.crearVenta(dto);
    }

    // ============ LISTAR VENTAS CON FILTROS ============
    @GetMapping
    public Page<VentaDTO> listarVentas(
            @RequestParam(required = false) Long clienteId,
            @RequestParam(required = false) String mes,
            @RequestParam(required = false) String año,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fechaInicio,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fechaFin,
            Pageable pageable
    ) {
        return ventaService.listarVentas(clienteId, mes, año, fechaInicio, fechaFin, pageable);
    }

    // ============ OBTENER DETALLE VENTA ============
    @GetMapping("/{id}")
    public VentaDTO obtenerVenta(@PathVariable Long id) {
        return ventaService.obtenerVenta(id);
    }

    // ============ ACTUALIZAR VENTA COMPLETA ============
    @PutMapping("/{id}")
    public VentaDTO actualizarVenta(@PathVariable Long id, @RequestBody VentaCreateDTO dto) {
        return ventaService.actualizarVenta(id, dto);
    }

    // ============ EDITAR ITEM INDIVIDUAL ============
    @PutMapping("/{ventaId}/items/{itemId}")
    public VentaDTO editarItem(@PathVariable Long ventaId, @PathVariable Long itemId,
                               @RequestBody VentaItemDTO itemDto) {
        return ventaService.editarItem(ventaId, itemId, itemDto);
    }

    // ============ ELIMINAR ITEM ============
    @DeleteMapping("/{ventaId}/items/{itemId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void eliminarItem(@PathVariable Long ventaId, @PathVariable Long itemId) {
        ventaService.eliminarItem(ventaId, itemId);
    }

    // ============ ELIMINAR VENTA COMPLETA ============
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void eliminarVenta(@PathVariable Long id) {
        ventaService.eliminarVenta(id);
    }

    // ============ DUPLICAR VENTA ============
    @PostMapping("/{id}/duplicar")
    @ResponseStatus(HttpStatus.CREATED)
    public VentaDTO duplicarVenta(@PathVariable Long id) {
        return ventaService.duplicarVenta(id);
    }

    // ============ CAMBIAR ESTADO ============
    @PatchMapping("/{id}/estado")
    public VentaDTO cambiarEstado(@PathVariable Long id, @RequestBody Map<String, String> request) {
        String nuevoEstado = request.get("estado");
        return ventaService.cambiarEstado(id, nuevoEstado);
    }

    // ============ ESTADÍSTICAS ============
    @GetMapping("/stats/periodo")
    public VentasEstadisticasDTO obtenerEstadisticas(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fechaInicio,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fechaFin
    ) {
        return ventaService.obtenerEstadisticas(fechaInicio, fechaFin);
    }
}