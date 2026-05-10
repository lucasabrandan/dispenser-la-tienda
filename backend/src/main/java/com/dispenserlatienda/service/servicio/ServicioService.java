package com.dispenserlatienda.service.servicio;
import com.dispenserlatienda.domain.equipo.Equipo;
import com.dispenserlatienda.domain.gasto.Gasto;
import com.dispenserlatienda.domain.sede.Sede;
import com.dispenserlatienda.dto.servicio.EstadisticasMensualDTO;
import com.dispenserlatienda.dto.servicio.TecnicoRendimientoDTO;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.Comparator;
import java.util.Map;
import java.util.TreeMap;

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
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.JpaSort;
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
        return listarFiltrado(null, null, null, null, null, null, null, pageable);
    }

    // Listado con filtros opcionales: tipo, estado, búsqueda, rango de fechas, usuarioId, clienteId
    @Transactional(readOnly = true)
    public Page<ServicioDTO> listarFiltrado(String tipoStr, String estadoStr,
                                             String busqueda, String desde, String hasta,
                                             Long usuarioId, Long clienteId, Pageable pageable) {
        // @Formula fields no están en el metamodel de JPA — Spring Data falla al resolver "total"
        // JpaSort.unsafe() bypasses esa validación y pasa la expresión directo a la query
        Pageable safePageable = pageable;
        if (pageable.getSort().stream().anyMatch(o -> o.getProperty().equals("total"))) {
            Sort newSort = Sort.unsorted();
            for (Sort.Order order : pageable.getSort()) {
                if (order.getProperty().equals("total")) {
                    newSort = newSort.and(JpaSort.unsafe(order.getDirection(), "total"));
                } else {
                    newSort = newSort.and(Sort.by(order));
                }
            }
            safePageable = PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(), newSort);
        }
        return servicioRepository.findAll(buildSpec(tipoStr, estadoStr, busqueda, desde, hasta, usuarioId, clienteId), safePageable)
                .map(this::mapToDTO);
    }

    // Stats resumen para el panel (totalMes, hoy, pendientes, ganancia MO)
    @Transactional(readOnly = true)
    public ServicioResumenDTO calcularResumen(String tipoStr) {
        LocalDate hoy       = LocalDate.now();
        LocalDate inicioMes = hoy.withDayOfMonth(1);
        LocalDate finMes    = inicioMes.plusMonths(1).minusDays(1);

        List<Servicio> realizados = servicioRepository.findAll(
                buildSpec(tipoStr, "REALIZADO", null, null, null, null, null));
        List<Servicio> pendientes = servicioRepository.findAll(
                buildSpec(tipoStr, "PRESUPUESTO", null, null, null, null, null));

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
                                               Long usuarioId, Long clienteId) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (tipoStr != null && !tipoStr.isBlank())
                predicates.add(cb.equal(root.get("servicioTipo"), ServicioTipo.valueOf(tipoStr)));
            if (estadoStr != null && !estadoStr.isBlank())
                predicates.add(cb.equal(root.get("estado"), EstadoServicio.valueOf(estadoStr)));
            if (busqueda != null && !busqueda.isBlank()) {
                String like = "%" + busqueda.toLowerCase() + "%";
                // JOIN items→equipo para buscar por número de serie
                jakarta.persistence.criteria.Join<Object,Object> items  = root.join("items",  jakarta.persistence.criteria.JoinType.LEFT);
                jakarta.persistence.criteria.Join<Object,Object> equipo = items.join("equipo", jakarta.persistence.criteria.JoinType.LEFT);
                query.distinct(true);
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("clienteNombre")), like),
                        cb.like(cb.lower(root.get("sedeNombre")), like),
                        cb.like(cb.lower(equipo.get("numeroSerie")), like),
                        cb.like(cb.lower(cb.coalesce(equipo.get("ubicacion"), "")), like),
                        cb.like(cb.lower(cb.coalesce(equipo.get("modelo"), "")), like)
                ));
            }
            if (desde != null && !desde.isBlank())
                predicates.add(cb.greaterThanOrEqualTo(root.get("fechaServicio"), LocalDate.parse(desde)));
            if (hasta != null && !hasta.isBlank())
                predicates.add(cb.lessThanOrEqualTo(root.get("fechaServicio"), LocalDate.parse(hasta)));
            if (usuarioId != null)
                predicates.add(cb.equal(root.get("usuario").get("id"), usuarioId));
            if (clienteId != null)
                predicates.add(cb.equal(root.get("sede").get("cliente").get("id"), clienteId));
            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    // Rendimiento mensual del técnico — solo meses cerrados, sin info de clientes
    // Fórmula: facturado − 30% impuestos − repuestos = gananciaNet → ÷2 = parte técnico
    @Transactional(readOnly = true)
    public List<TecnicoRendimientoDTO> rendimientoTecnico(Long tecnicoId) {
        final BigDecimal PCT_IMPUESTOS = BigDecimal.valueOf(30);
        final java.math.RoundingMode RM = java.math.RoundingMode.HALF_UP;
        YearMonth mesActual = YearMonth.now();

        List<Servicio> realizados = servicioRepository.findAll(
                buildSpec(null, "REALIZADO", null, null, null, tecnicoId, null));

        // [0]=facturado [1]=repuestos
        Map<YearMonth, BigDecimal[]> porMes  = new TreeMap<>();
        Map<YearMonth, Integer>      countMes = new TreeMap<>();

        for (Servicio s : realizados) {
            if (s.getFechaServicio() == null) continue;
            YearMonth ym = YearMonth.from(s.getFechaServicio());
            // incluir mes actual (el técnico necesita ver su rendimiento en tiempo real)

            // Total facturado (con descuento)
            BigDecimal facturado = s.getItems().stream()
                    .map(i -> i.getCosto() != null ? i.getCosto() : BigDecimal.ZERO)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            BigDecimal descPct = s.getDescuentoPorcentaje();
            if (descPct != null && descPct.compareTo(BigDecimal.ZERO) > 0) {
                BigDecimal factor = BigDecimal.ONE.subtract(descPct.divide(BigDecimal.valueOf(100), 4, RM));
                facturado = facturado.multiply(factor).setScale(2, RM);
            }

            // Costo de repuestos (suma de subtotales del JSON)
            BigDecimal repuestos = BigDecimal.ZERO;
            for (ServicioItem item : s.getItems()) {
                String json = item.getRepuestosUsados();
                if (json == null || json.isBlank()) continue;
                try {
                    List<java.util.Map<String, Object>> lista = objectMapper.readValue(
                            json, new TypeReference<>() {});
                    for (java.util.Map<String, Object> r : lista) {
                        Object sub = r.get("subtotal");
                        Object precio = r.get("precio");
                        Object cant   = r.get("cantidad");
                        BigDecimal val = BigDecimal.ZERO;
                        if (sub != null) {
                            val = new BigDecimal(sub.toString());
                        } else if (precio != null && cant != null) {
                            val = new BigDecimal(precio.toString())
                                    .multiply(new BigDecimal(cant.toString()));
                        }
                        repuestos = repuestos.add(val);
                    }
                } catch (JsonProcessingException ignored) {}
            }

            porMes.merge(ym, new BigDecimal[]{ facturado, repuestos },
                    (a, b) -> new BigDecimal[]{ a[0].add(b[0]), a[1].add(b[1]) });
            countMes.merge(ym, 1, Integer::sum);
        }

        return porMes.entrySet().stream()
                .sorted(Map.Entry.<YearMonth, BigDecimal[]>comparingByKey().reversed())
                .map(e -> {
                    BigDecimal fact   = e.getValue()[0].setScale(2, RM);
                    BigDecimal reps   = e.getValue()[1].setScale(2, RM);
                    BigDecimal imp    = fact.multiply(PCT_IMPUESTOS)
                                           .divide(BigDecimal.valueOf(100), 2, RM);
                    BigDecimal ganNet = fact.subtract(imp).subtract(reps).max(BigDecimal.ZERO);
                    BigDecimal tecni  = ganNet.divide(BigDecimal.valueOf(2), 2, RM);
                    return new TecnicoRendimientoDTO(
                            e.getKey().toString(),
                            countMes.getOrDefault(e.getKey(), 0),
                            fact, imp, reps, ganNet, tecni);
                })
                .collect(java.util.stream.Collectors.toList());
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
        if (dto.getOrdenId() != null) {
            servicio.setOrdenId(dto.getOrdenId());
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
                    i.getEquipo() != null ? i.getEquipo().getPiso() : null,
                    i.getEquipo() != null ? i.getEquipo().getSector() : null,
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