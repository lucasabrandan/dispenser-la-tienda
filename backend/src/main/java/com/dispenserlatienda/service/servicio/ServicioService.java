package com.dispenserlatienda.service.servicio;
import com.dispenserlatienda.domain.equipo.Equipo;
import com.dispenserlatienda.domain.gasto.Gasto;
import com.dispenserlatienda.domain.sede.Sede;
import com.dispenserlatienda.dto.servicio.EstadisticasMensualDTO;
import java.time.LocalDate;

import com.dispenserlatienda.domain.servicio.*;
import com.dispenserlatienda.domain.usuario.Usuario;
import com.dispenserlatienda.dto.servicio.*;
import com.dispenserlatienda.exception.ResourceNotFoundException;
import com.dispenserlatienda.repository.equipo.EquipoRepository;
import com.dispenserlatienda.repository.gasto.GastoRepository;
import com.dispenserlatienda.repository.sede.SedeRepository;
import com.dispenserlatienda.repository.servicio.ServicioRepository;
import com.dispenserlatienda.repository.usuario.UsuarioRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

// Servicio para gestionar servicios y presupuestos
// Implementa paginación para el listado de servicios
@Service
public class ServicioService {
    private final ServicioRepository servicioRepository;
    private final SedeRepository sedeRepository;
    private final UsuarioRepository usuarioRepository;
    private final EquipoRepository equipoRepository;
    private final GastoRepository gastoRepository;
    private final ObjectMapper objectMapper;

    public ServicioService(ServicioRepository servicioRepository, SedeRepository sedeRepository,
                           UsuarioRepository usuarioRepository, EquipoRepository equipoRepository,
                           GastoRepository gastoRepository, ObjectMapper objectMapper) {
        this.servicioRepository = servicioRepository;
        this.sedeRepository = sedeRepository;
        this.usuarioRepository = usuarioRepository;
        this.equipoRepository = equipoRepository;
        this.gastoRepository = gastoRepository;
        this.objectMapper = objectMapper;
    }

    @Transactional(readOnly = true)
    public Page<ServicioDTO> listarTodos(Pageable pageable) {
        return listarFiltrado(null, null, null, null, null, null, pageable);
    }

    // Listado con filtros opcionales: tipo, estado, búsqueda, rango de fechas, usuarioId
    @Transactional(readOnly = true)
    public Page<ServicioDTO> listarFiltrado(String tipoStr, String estadoStr,
                                             String busqueda, String desde, String hasta,
                                             Long usuarioId, Pageable pageable) {
        return servicioRepository.findAll(buildSpec(tipoStr, estadoStr, busqueda, desde, hasta, usuarioId), pageable)
                .map(this::mapToDTO);
    }

    // Stats resumen para el panel (totalMes, hoy, pendientes, ganancia MO)
    @Transactional(readOnly = true)
    public ServicioResumenDTO calcularResumen(String tipoStr) {
        LocalDate hoy       = LocalDate.now();
        LocalDate inicioMes = hoy.withDayOfMonth(1);
        LocalDate finMes    = inicioMes.plusMonths(1).minusDays(1);

        List<Servicio> realizados = servicioRepository.findAll(
                buildSpec(tipoStr, "REALIZADO", null, null, null, null));
        List<Servicio> pendientes = servicioRepository.findAll(
                buildSpec(tipoStr, "PRESUPUESTO", null, null, null, null));

        List<Servicio> delMes = realizados.stream()
                .filter(s -> s.getFechaServicio() != null
                        && !s.getFechaServicio().isBefore(inicioMes)
                        && !s.getFechaServicio().isAfter(finMes))
                .toList();

        List<Servicio> deHoy = realizados.stream()
                .filter(s -> hoy.equals(s.getFechaServicio()))
                .toList();

        double totalMes     = sumarItems(delMes);
        double totalHoy     = sumarItems(deHoy);
        double gananciaTotal = delMes.stream()
                .flatMap(s -> s.getItems().stream())
                .mapToDouble(i -> i.getCostoExtra() != null ? i.getCostoExtra().doubleValue() : 0)
                .sum();
        double pendientesVal = sumarItems(pendientes);

        return new ServicioResumenDTO(
                totalMes, delMes.size(),
                totalHoy, deHoy.size(),
                gananciaTotal,
                pendientes.size(), pendientesVal
        );
    }

    private Specification<Servicio> buildSpec(String tipoStr, String estadoStr,
                                               String busqueda, String desde, String hasta,
                                               Long usuarioId) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (tipoStr != null && !tipoStr.isBlank())
                predicates.add(cb.equal(root.get("servicioTipo"), ServicioTipo.valueOf(tipoStr)));
            if (estadoStr != null && !estadoStr.isBlank())
                predicates.add(cb.equal(root.get("estado"), EstadoServicio.valueOf(estadoStr)));
            if (busqueda != null && !busqueda.isBlank()) {
                String like = "%" + busqueda.toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("clienteNombre")), like),
                        cb.like(cb.lower(root.get("sedeNombre")), like)
                ));
            }
            if (desde != null && !desde.isBlank())
                predicates.add(cb.greaterThanOrEqualTo(root.get("fechaServicio"), LocalDate.parse(desde)));
            if (hasta != null && !hasta.isBlank())
                predicates.add(cb.lessThanOrEqualTo(root.get("fechaServicio"), LocalDate.parse(hasta)));
            if (usuarioId != null)
                predicates.add(cb.equal(root.get("usuario").get("id"), usuarioId));
            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    private double sumarItems(List<Servicio> servicios) {
        return servicios.stream()
                .flatMap(s -> s.getItems().stream())
                .mapToDouble(i -> i.getCosto() != null ? i.getCosto().doubleValue() : 0)
                .sum();
    }

    @Transactional(readOnly = true)
    public ServicioDTO buscarPorId(Long id) {
        return servicioRepository.findById(id)
                .map(this::mapToDTO)
                .orElseThrow(() -> new ResourceNotFoundException("Servicio no encontrado con ID: " + id));
    }

    @Transactional
    public ServicioDTO crearServicioCompleto(ServicioCreateDTO dto) {
        return procesarGuardado(new Servicio(), dto);
    }

    @Transactional
    public ServicioDTO actualizarServicio(Long id, ServicioCreateDTO dto) {
        Servicio servicio = servicioRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("No existe el servicio con ID: " + id));

        servicio.getItems().clear();
        return procesarGuardado(servicio, dto);
    }

    private ServicioDTO procesarGuardado(Servicio servicio, ServicioCreateDTO dto) {
        Sede sede = sedeRepository.findById(dto.getSedeId())
                .orElseThrow(() -> new ResourceNotFoundException("Sede no encontrada"));

        // Ahora lanzamos excepción si usuario no existe (en lugar de usar .get(0))
        Usuario usuario = usuarioRepository.findById(dto.getUsuarioId())
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado con ID: " + dto.getUsuarioId()));

        boolean esNuevo = servicio.getId() == null;
        servicio.setSede(sede);
        servicio.setUsuario(usuario);
        if (esNuevo) {
            servicio.setCreadoEn(LocalDateTime.now());
        } else {
            servicio.setModificadoPorNombre(usuario.getNombre());
            servicio.setFechaModificacion(LocalDateTime.now());
        }
        servicio.setFechaServicio(LocalDate.parse(dto.getFecha()));
        servicio.setClienteNombre(dto.getClienteNombre());
        servicio.setSedeNombre(dto.getSedeNombre());

        // Si el estado viene en String del DTO, convertir a enum
        // Si viene vacío, usar PRESUPUESTO por defecto
        if (dto.getEstado() != null && !dto.getEstado().isEmpty()) {
            try {
                servicio.setEstado(EstadoServicio.valueOf(dto.getEstado()));
            } catch (IllegalArgumentException e) {
                servicio.setEstado(EstadoServicio.PRESUPUESTO);
            }
        } else {
            servicio.setEstado(EstadoServicio.PRESUPUESTO);
        }

        servicio.setFotoRemito(dto.getFotoRemito());
        servicio.setDescuentoPorcentaje(dto.getDescuentoPorcentaje());
        servicio.setObservaciones(dto.getObservaciones());
        if (dto.getPresupuestoOrigenId() != null) {
            servicio.setPresupuestoOrigenId(dto.getPresupuestoOrigenId());
        }

        ServicioTipo tipoDetectado = ServicioTipo.VENTA;

        for (var itemDto : dto.getItems()) {
            if (itemDto.equipoSerial() != null && !itemDto.equipoSerial().equalsIgnoreCase("MOSTRADOR")) {
                tipoDetectado = ServicioTipo.TECNICA;
            }

            Equipo equipo = equipoRepository.findByNumeroSerie(itemDto.equipoSerial()).orElse(null);

            LocalDate fechaGarantia = null;
            if (itemDto.garantiaHasta() != null && !itemDto.garantiaHasta().isBlank()) {
                fechaGarantia = LocalDate.parse(itemDto.garantiaHasta());
            }

            BigDecimal costoBlindado = itemDto.costo().max(BigDecimal.ZERO);
            BigDecimal extraBlindado = (itemDto.costoExtra() != null) ? itemDto.costoExtra().max(BigDecimal.ZERO) : BigDecimal.ZERO;
            BigDecimal internoBlindado = (itemDto.costoInterno() != null) ? itemDto.costoInterno().max(BigDecimal.ZERO) : BigDecimal.ZERO;

            // Convertir el String metodoPago del DTO a enum MetodoPago
            MetodoPago metodoPago = MetodoPago.EFECTIVO; // Valor por defecto
            if (itemDto.metodoPago() != null && !itemDto.metodoPago().isEmpty()) {
                try {
                    metodoPago = MetodoPago.valueOf(itemDto.metodoPago());
                } catch (IllegalArgumentException e) {
                    metodoPago = MetodoPago.EFECTIVO; // Si no es válido, usar default
                }
            }

            ServicioItem nuevoItem = new ServicioItem(
                    equipo,
                    itemDto.tecnico(),
                    costoBlindado,
                    internoBlindado,
                    BigDecimal.ZERO,
                    metodoPago,
                    itemDto.trabajoRealizado(),
                    fechaGarantia
            );
            nuevoItem.setCostoExtra(extraBlindado);
            nuevoItem.setFotoAntes(itemDto.fotoAntes());
            nuevoItem.setFotoDespues(itemDto.fotoDespues());

            try {
                if (itemDto.repuestosUsados() != null) {
                    nuevoItem.setRepuestosUsados(objectMapper.writeValueAsString(itemDto.repuestosUsados()));
                }
            } catch (JsonProcessingException e) { e.printStackTrace(); }

            servicio.addItem(nuevoItem);
        }

        servicio.setServicioTipo(tipoDetectado);

        return mapToDTO(servicioRepository.save(servicio));
    }

    @Transactional
    public ServicioDTO cambiarEstado(Long id, String nuevoEstado) {
        Servicio s = servicioRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("No existe"));

        // Convertir String a EstadoServicio enum
        try {
            s.setEstado(EstadoServicio.valueOf(nuevoEstado));
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Estado inválido: " + nuevoEstado + ". Valores permitidos: " + java.util.Arrays.toString(EstadoServicio.values()));
        }

        return mapToDTO(servicioRepository.save(s));
    }

    private ServicioDTO mapToDTO(Servicio s) {
        List<ServicioItemDTO> items = s.getItems().stream().map(i -> {
            List<RepuestoUsadoDTO> listaRepuestos = new ArrayList<>();
            try {
                if (i.getRepuestosUsados() != null && !i.getRepuestosUsados().isEmpty()) {
                    listaRepuestos = objectMapper.readValue(i.getRepuestosUsados(),
                            new TypeReference<List<RepuestoUsadoDTO>>(){});
                }
            } catch (JsonProcessingException e) { e.printStackTrace(); }

            String garantiaStr = (i.getGarantiaHasta() != null) ? i.getGarantiaHasta().toString() : null;

            return new ServicioItemDTO(
                    i.getEquipo() != null ? i.getEquipo().getId() : null,
                    i.getEquipo() != null ? i.getEquipo().getNumeroSerie() : "MOSTRADOR",
                    i.getEquipo() != null ? i.getEquipo().getModelo() : null,
                    i.getEquipo() != null ? i.getEquipo().getUbicacion() : "MOSTRADOR",
                    i.getTecnico(), i.getCosto(), i.getCostoExtra(), i.getCostoInterno(),
                    i.getDescuento(),
                    i.getMetodoPago() != null ? i.getMetodoPago().name() : "EFECTIVO",
                    i.getTrabajoRealizado(),
                    garantiaStr,
                    listaRepuestos, i.getFotoAntes(), i.getFotoDespues()
            );
        }).toList();

        // Navegar Sede → Cliente para obtener datos de contacto
        var sede    = s.getSede();
        var cliente = (sede != null) ? sede.getCliente() : null;

        var usuario = s.getUsuario();
        String fechaMod = s.getFechaModificacion() != null
                ? s.getFechaModificacion().toString() : null;

        return new ServicioDTO(
                s.getId(),
                s.getFechaServicio() != null ? s.getFechaServicio().toString() : null,
                s.getServicioTipo() != null ? s.getServicioTipo().name() : "VENTA",
                cliente != null ? cliente.getId() : null,
                s.getClienteNombre(),
                cliente != null ? cliente.getTelefono() : null,
                cliente != null ? cliente.getEmail()    : null,
                cliente != null ? cliente.getCuilDni()  : null,
                cliente != null && cliente.getCondicionIva() != null ? cliente.getCondicionIva().name() : null,
                sede != null ? sede.getId() : null,
                s.getSedeNombre(),
                sede != null ? sede.getDireccion() : null,
                items,
                s.getEstado() != null ? s.getEstado().name() : "PRESUPUESTO",
                s.getFotoRemito(),
                s.getDescuentoPorcentaje(),
                s.getObservaciones(),
                s.getNroDocumento(),
                usuario != null ? usuario.getId() : null,
                usuario != null ? usuario.getNombre() : null,
                s.getModificadoPorNombre(),
                fechaMod,
                s.getPresupuestoOrigenId()
        );
    }

    @Transactional
    public ServicioDTO guardarNroDocumento(Long id, String nroDocumento) {
        Servicio s = servicioRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("No existe el servicio " + id));
        s.setNroDocumento(nroDocumento);
        return mapToDTO(servicioRepository.save(s));
    }

    @Transactional(readOnly = true)
    public EstadisticasMensualDTO calcularEstadisticasMensual(String mes) {
        LocalDate inicioMes = LocalDate.parse(mes + "-01");
        LocalDate finMes = inicioMes.plusMonths(1).minusDays(1);

        List<Servicio> serviciosMes = servicioRepository.findAll().stream()
                .filter(s -> s.getFechaServicio() != null
                        && !s.getFechaServicio().isBefore(inicioMes)
                        && !s.getFechaServicio().isAfter(finMes))
                .toList();

        BigDecimal facturacion = BigDecimal.ZERO;
        BigDecimal costoRepuestos = BigDecimal.ZERO;
        List<EstadisticasMensualDTO.TransaccionDTO> transacciones = new ArrayList<>();

        for (Servicio servicio : serviciosMes) {
            for (ServicioItem item : servicio.getItems()) {
                BigDecimal venta = item.getCosto()
                        .add(item.getCostoExtra() != null ? item.getCostoExtra() : BigDecimal.ZERO)
                        .subtract(item.getDescuento() != null ? item.getDescuento() : BigDecimal.ZERO);

                facturacion = facturacion.add(venta);

                BigDecimal costosRepuestos = BigDecimal.ZERO;
                try {
                    if (item.getRepuestosUsados() != null && !item.getRepuestosUsados().isEmpty()) {
                        List<RepuestoUsadoDTO> repuestos = objectMapper.readValue(
                                item.getRepuestosUsados(),
                                new TypeReference<List<RepuestoUsadoDTO>>(){}
                        );
                        for (RepuestoUsadoDTO repuesto : repuestos) {
                            costosRepuestos = costosRepuestos.add(repuesto.subtotal());
                        }
                    }
                } catch (Exception e) {
                    e.printStackTrace();
                }

                costoRepuestos = costoRepuestos.add(costosRepuestos);

                String concepto = servicio.getClienteNombre() + " - " + item.getTrabajoRealizado();
                EstadisticasMensualDTO.TransaccionDTO transaccion = new EstadisticasMensualDTO.TransaccionDTO(
                        servicio.getId(),
                        servicio.getFechaServicio().toString(),
                        concepto,
                        costosRepuestos,
                        venta,
                        servicio.getServicioTipo().name()
                );
                transacciones.add(transaccion);
            }
        }

        // Obtener gastos del mes y sumarlos
        List<Gasto> gastosMes = gastoRepository.findByFechaBetween(inicioMes, finMes);
        BigDecimal gastosVarios = gastosMes.stream()
                .map(Gasto::getMonto)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal gananciaReal = facturacion.subtract(costoRepuestos).subtract(gastosVarios);

        return new EstadisticasMensualDTO(
                mes,
                facturacion,
                costoRepuestos,
                gastosVarios,
                gananciaReal,
                transacciones
        );
    }
}