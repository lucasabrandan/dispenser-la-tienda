package com.dispenserlatienda.service.venta;

import com.dispenserlatienda.domain.cliente.Cliente;
import com.dispenserlatienda.domain.venta.Venta;
import com.dispenserlatienda.domain.venta.VentaItem;
import com.dispenserlatienda.dto.venta.VentaCreateDTO;
import com.dispenserlatienda.dto.venta.VentaDTO;
import com.dispenserlatienda.dto.venta.VentaItemDTO;
import com.dispenserlatienda.dto.venta.VentasEstadisticasDTO;
import com.dispenserlatienda.exception.BusinessException;
import com.dispenserlatienda.exception.ResourceNotFoundException;
import com.dispenserlatienda.repository.cliente.ClienteRepository;
import com.dispenserlatienda.repository.venta.VentaItemRepository;
import com.dispenserlatienda.repository.venta.VentaRepository;
import com.dispenserlatienda.service.common.BaseService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Servicio para gestionar ventas de repuestos.
 *
 * Responsabilidades:
 * - CRUD de ventas (crear, leer, actualizar, eliminar)
 * - Cálculos automáticos (costo, ganancia, totales)
 * - Búsquedas con filtros (cliente, fecha, mes, año)
 * - Operaciones especiales (duplicar, cambiar estado)
 * - Estadísticas de ventas
 *
 * IMPORTANTE: Los totales se recalculan automáticamente al cambiar items.
 * El IVA es fijo al 21% (puede cambiar en v2.0.0 si se requiere variable).
 *
 * @author Dispenser La Tienda
 * @version 1.0.0
 */
@Service
public class VentaService extends BaseService<Venta, VentaRepository> {

    private final VentaItemRepository ventaItemRepository;
    private final ClienteRepository clienteRepository;

    public VentaService(VentaRepository ventaRepository,
                        VentaItemRepository ventaItemRepository,
                        ClienteRepository clienteRepository) {
        super(ventaRepository);
        this.ventaItemRepository = ventaItemRepository;
        this.clienteRepository = clienteRepository;
    }

    // ============ MÉTODOS CRUD ============

    /**
     * Crear una nueva venta con los items proporcionados.
     * Calcula automáticamente los totales considerando descuentos e IVA.
     *
     * @param dto DTO con datos de cliente, items y descuentos
     * @return Venta creada con todos los cálculos
     * @throws ResourceNotFoundException si cliente no existe
     * @throws BusinessException si hay errores de validación
     */
    @Transactional
    public VentaDTO crearVenta(VentaCreateDTO dto) {
        logger.info("Creando nueva venta para cliente ID: {}", dto.clienteId());

        // Validar cliente existe
        Cliente cliente = clienteRepository.findById(dto.clienteId())
                .orElseThrow(() -> new ResourceNotFoundException("Cliente no encontrado con ID: " + dto.clienteId()));

        // Validar items no vacío
        if (dto.items() == null || dto.items().isEmpty()) {
            throw new BusinessException("EMPTY_ITEMS", "La venta debe tener al menos 1 item");
        }

        // Crear venta
        Venta venta = new Venta(cliente, dto.fecha());
        venta.setObservaciones(dto.observaciones());

        // Agregar items - ✅ AGREGAR final AQUÍ
        final List<VentaItem> items = dto.items().stream()
                .map(itemDto -> crearVentaItem(itemDto))
                .collect(Collectors.toList());

        venta.setItems(items);
        Venta finalVenta = venta;
        items.forEach(item -> item.setVenta(finalVenta));

        // Calcular totales
        calcularTotalesVenta(venta, dto.descuentoPorcentaje());

        // Guardar (setCreatedAt y setUpdatedAt se llaman automáticamente en @PrePersist)
        venta = repository.save(venta);

        logger.info("Venta creada exitosamente. ID: {}, Total: ${}", venta.getId(), venta.getTotalIngreso());
        return mapToDTO(venta);
    }

    /**
     * Actualizar una venta existente.
     * Se recalculan todos los totales.
     */
    @Transactional
    public VentaDTO actualizarVenta(Long id, VentaCreateDTO dto) {
        logger.info("Actualizando venta ID: {}", id);

        Venta venta = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Venta no encontrada con ID: " + id));

        // Validar cliente
        Cliente cliente = clienteRepository.findById(dto.clienteId())
                .orElseThrow(() -> new ResourceNotFoundException("Cliente no encontrado con ID: " + dto.clienteId()));

        venta.setCliente(cliente);
        venta.setFecha(dto.fecha());
        venta.setObservaciones(dto.observaciones());

        // Eliminar items antiguos
        ventaItemRepository.deleteByVentaId(id);

        // Agregar nuevos items - ✅ AGREGAR final AQUÍ
        final List<VentaItem> items = dto.items().stream()
                .map(this::crearVentaItem)
                .collect(Collectors.toList());

        venta.setItems(items);
        Venta finalVenta = venta;
        items.forEach(item -> item.setVenta(finalVenta));

        // Recalcular totales
        calcularTotalesVenta(venta, dto.descuentoPorcentaje());

        // Guardar (setUpdatedAt se llama automáticamente en @PreUpdate)
        venta = repository.save(venta);

        logger.info("Venta actualizada. ID: {}, nuevo total: ${}", id, venta.getTotalIngreso());
        return mapToDTO(venta);
    }

    /**
     * Editar un item individual de una venta sin perder los demás.
     */
    @Transactional
    public VentaDTO editarItem(Long ventaId, Long itemId, VentaItemDTO itemDto) {
        logger.info("Editando item ID: {} de venta ID: {}", itemId, ventaId);

        Venta venta = repository.findById(ventaId)
                .orElseThrow(() -> new ResourceNotFoundException("Venta no encontrada"));

        VentaItem item = ventaItemRepository.findById(itemId)
                .orElseThrow(() -> new ResourceNotFoundException("Item no encontrado"));

        if (!item.getVenta().getId().equals(ventaId)) {
            throw new BusinessException("INVALID_ITEM", "El item no pertenece a esta venta");
        }

        // Actualizar valores
        item.setDescripcion(itemDto.descripcion());
        item.setCantidad(itemDto.cantidad());
        item.setCostoUnitario(itemDto.costoUnitario());
        item.setPrecioListaUnitario(itemDto.precioListaUnitario());
        item.setPrecioAplicadoUnitario(itemDto.precioAplicadoUnitario());

        ventaItemRepository.save(item);

        // Recalcular totales de la venta
        calcularTotalesVenta(venta, venta.getDescuentoPorcentaje());
        venta = repository.save(venta);

        return mapToDTO(venta);
    }

    /**
     * Eliminar un item de una venta.
     */
    @Transactional
    public VentaDTO eliminarItem(Long ventaId, Long itemId) {
        logger.info("Eliminando item ID: {} de venta ID: {}", itemId, ventaId);

        Venta venta = repository.findById(ventaId)
                .orElseThrow(() -> new ResourceNotFoundException("Venta no encontrada"));

        VentaItem item = ventaItemRepository.findById(itemId)
                .orElseThrow(() -> new ResourceNotFoundException("Item no encontrado"));

        if (!item.getVenta().getId().equals(ventaId)) {
            throw new BusinessException("INVALID_ITEM", "El item no pertenece a esta venta");
        }

        ventaItemRepository.delete(item);

        // Recalcular totales
        calcularTotalesVenta(venta, venta.getDescuentoPorcentaje());
        venta = repository.save(venta);

        return mapToDTO(venta);
    }

    /**
     * Eliminar una venta completa.
     */
    @Transactional
    public void eliminarVenta(Long id) {
        logger.info("Eliminando venta ID: {}", id);

        Venta venta = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Venta no encontrada con ID: " + id));

        repository.delete(venta);
        logger.info("Venta eliminada exitosamente");
    }

    /**
     * Listar ventas con filtros opcionales.
     * Si no hay filtros, retorna todas ordenadas por fecha DESC.
     *
     * IMPORTANTE: Si se proporciona mes/año, se ignoran fechaInicio/fechaFin.
     */
    @Transactional(readOnly = true)
    public Page<VentaDTO> listarVentas(Long clienteId, String mes, String año,
                                       LocalDate fechaInicio, LocalDate fechaFin,
                                       Pageable pageable) {
        logger.info("Listando ventas. Filtros - Cliente: {}, Mes: {}, Año: {}", clienteId, mes, año);

        Page<Venta> ventas;

        // Si hay rango de fechas específico
        if (fechaInicio != null && fechaFin != null) {
            if (clienteId != null) {
                ventas = repository.findByClienteIdAndFechaBetween(clienteId, fechaInicio, fechaFin, pageable);
            } else {
                ventas = repository.findByFechaBetween(fechaInicio, fechaFin, pageable);
            }
        }
        // Si hay mes/año
        else if (mes != null && año != null) {
            YearMonth ym = YearMonth.parse(año + "-" + mes);
            LocalDate inicio = ym.atDay(1);
            LocalDate fin = ym.atEndOfMonth();

            if (clienteId != null) {
                ventas = repository.findByClienteIdAndFechaBetween(clienteId, inicio, fin, pageable);
            } else {
                ventas = repository.findByFechaBetween(inicio, fin, pageable);
            }
        }
        // Solo por cliente
        else if (clienteId != null) {
            ventas = repository.findByClienteId(clienteId, pageable);
        }
        // Todas
        else {
            ventas = repository.findAllByOrderByFechaDesc(pageable);
        }

        return ventas.map(this::mapToDTO);
    }

    /**
     * Obtener una venta completa por ID.
     */
    @Transactional(readOnly = true)
    public VentaDTO obtenerVenta(Long id) {
        logger.info("Obteniendo detalle de venta ID: {}", id);
        Venta venta = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Venta no encontrada con ID: " + id));
        return mapToDTO(venta);
    }

    /**
     * Duplicar una venta existente.
     * Crea nueva venta con mismo cliente e items, fecha actual, sin descuentos.
     */
    @Transactional
    public VentaDTO duplicarVenta(Long id) {
        logger.info("Duplicando venta ID: {}", id);

        Venta ventaOriginal = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Venta no encontrada"));

        // Crear nueva venta
        Venta nuevaVenta = new Venta(ventaOriginal.getCliente(), LocalDate.now());
        nuevaVenta.setObservaciones(ventaOriginal.getObservaciones());

        // Duplicar items - ✅ AGREGAR final AQUÍ
        Venta finalNuevaVenta = nuevaVenta;
        final List<VentaItem> nuevosItems = ventaOriginal.getItems().stream()
                .map(item -> new VentaItem(
                        item.getDescripcion(),
                        item.getCantidad(),
                        item.getCostoUnitario(),
                        item.getPrecioListaUnitario(),
                        item.getPrecioAplicadoUnitario()
                ))
                .peek(item -> item.setVenta(finalNuevaVenta))
                .collect(Collectors.toList());

        nuevaVenta.setItems(nuevosItems);

        // Recalcular con descuento 0
        calcularTotalesVenta(nuevaVenta, BigDecimal.ZERO);

        nuevaVenta = repository.save(nuevaVenta);

        logger.info("Venta duplicada exitosamente. Nueva ID: {}", nuevaVenta.getId());
        return mapToDTO(nuevaVenta);
    }

    /**
     * Cambiar estado de una venta (CONFIRMADA -> PAGADA, etc).
     */
    @Transactional
    public VentaDTO cambiarEstado(Long id, String nuevoEstado) {
        logger.info("Cambiando estado de venta ID: {} a: {}", id, nuevoEstado);

        Venta venta = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Venta no encontrada"));

        try {
            venta.setEstado(Venta.EstadoVenta.valueOf(nuevoEstado.toUpperCase()));
            venta = repository.save(venta);
            logger.info("Estado actualizado exitosamente");
        } catch (IllegalArgumentException e) {
            throw new BusinessException("INVALID_STATUS", "Estado inválido: " + nuevoEstado);
        }

        return mapToDTO(venta);
    }

    /**
     * Obtener estadísticas de ventas en un período.
     */
    @Transactional(readOnly = true)
    public VentasEstadisticasDTO obtenerEstadisticas(LocalDate fechaInicio, LocalDate fechaFin) {
        logger.info("Obteniendo estadísticas de ventas: {} a {}", fechaInicio, fechaFin);

        long totalVentas = repository.countByPeriodo(fechaInicio, fechaFin);
        BigDecimal totalIngresos = repository.sumIngresosByPeriodo(fechaInicio, fechaFin);
        BigDecimal totalCostos = repository.sumCostosByPeriodo(fechaInicio, fechaFin);
        BigDecimal totalGanancia = repository.sumGananciaByPeriodo(fechaInicio, fechaFin);

        // Manejo de nulls
        totalIngresos = totalIngresos != null ? totalIngresos : BigDecimal.ZERO;
        totalCostos = totalCostos != null ? totalCostos : BigDecimal.ZERO;
        totalGanancia = totalGanancia != null ? totalGanancia : BigDecimal.ZERO;

        // Calcular margen: (ganancia / ingresos) × 100
        BigDecimal margen = totalIngresos.compareTo(BigDecimal.ZERO) > 0
                ? totalGanancia.divide(totalIngresos, 4, RoundingMode.HALF_UP).multiply(BigDecimal.valueOf(100))
                : BigDecimal.ZERO;

        return new VentasEstadisticasDTO(totalVentas, totalIngresos, totalCostos, totalGanancia, margen);
    }

    // ============ MÉTODOS PRIVADOS - CÁLCULOS ============

    /**
     * Recalcula todos los totales de una venta.
     * Se llama automáticamente al crear, actualizar o eliminar items.
     *
     * Fórmulas:
     * 1. Subtotal = SUM(item.cantidad × item.precioAplicado)
     * 2. Descuento = Subtotal × (descuentoPorcentaje / 100)
     * 3. IVA = (Subtotal - Descuento) × 0.21
     * 4. Total = Subtotal - Descuento + IVA
     * 5. Ganancia = Total - SUM(item.cantidad × item.costo)
     */
    private void calcularTotalesVenta(Venta venta, BigDecimal descuentoPorcentaje) {
        // Calcular subtotales de items
        BigDecimal subtotalCosto = BigDecimal.ZERO;
        BigDecimal subtotalVenta = BigDecimal.ZERO;

        for (VentaItem item : venta.getItems()) {
            subtotalCosto = subtotalCosto.add(item.getSubtotalCosto());
            subtotalVenta = subtotalVenta.add(item.getSubtotalVenta());
        }

        venta.setSubtotalCosto(subtotalCosto);
        venta.setSubtotalVenta(subtotalVenta);

        // Aplicar descuento
        if (descuentoPorcentaje == null) {
            descuentoPorcentaje = BigDecimal.ZERO;
        }
        venta.setDescuentoPorcentaje(descuentoPorcentaje);

        BigDecimal descuentoMonto = subtotalVenta.multiply(descuentoPorcentaje)
                .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
        venta.setDescuentoMonto(descuentoMonto);

        BigDecimal subtotalConDescuento = subtotalVenta.subtract(descuentoMonto);

        // Calcular IVA (21%)
        BigDecimal iva = subtotalConDescuento.multiply(BigDecimal.valueOf(0.21))
                .setScale(2, RoundingMode.HALF_UP);
        venta.setIva(iva);

        // Total ingreso
        BigDecimal totalIngreso = subtotalConDescuento.add(iva);
        venta.setTotalIngreso(totalIngreso);

        // Ganancia real
        BigDecimal gananciaReal = totalIngreso.subtract(subtotalCosto);
        venta.setGananciaReal(gananciaReal);
    }

    /**
     * Crear un VentaItem desde su DTO.
     */
    private VentaItem crearVentaItem(VentaItemDTO dto) {
        return new VentaItem(
                dto.descripcion(),
                dto.cantidad(),
                dto.costoUnitario(),
                dto.precioListaUnitario(),
                dto.precioAplicadoUnitario()
        );
    }

    /**
     * Convertir Venta a VentaDTO.
     */
    private VentaDTO mapToDTO(Venta venta) {
        List<VentaItemDTO> itemsDto = venta.getItems().stream()
                .map(item -> new VentaItemDTO(
                        item.getId(),
                        item.getDescripcion(),
                        item.getCantidad(),
                        item.getCostoUnitario(),
                        item.getPrecioListaUnitario(),
                        item.getPrecioAplicadoUnitario(),
                        item.getGananciaUnitaria(),
                        item.getSubtotalCosto(),
                        item.getSubtotalVenta(),
                        item.getGananciaTotalItem()
                ))
                .collect(Collectors.toList());

        return new VentaDTO(
                venta.getId(),
                venta.getCliente().getId(),
                venta.getCliente().getNombre(),
                venta.getCliente().getEmail(),
                venta.getCliente().getTelefono(),
                venta.getFecha(),
                itemsDto,
                venta.getSubtotalCosto(),
                venta.getSubtotalVenta(),
                venta.getDescuentoPorcentaje(),
                venta.getDescuentoMonto(),
                venta.getIva(),
                venta.getTotalIngreso(),
                venta.getGananciaReal(),
                venta.getEstado().toString(),
                venta.getCreatedAt(),
                venta.getUpdatedAt(),
                venta.getObservaciones()
        );
    }

    @Override
    protected String getEntityName() {
        return "Venta";
    }
}