package com.dispenserlatienda.service.servicio;
import com.dispenserlatienda.domain.equipo.Equipo;
import com.dispenserlatienda.domain.gasto.Gasto;
import com.dispenserlatienda.domain.sede.Sede;
import com.dispenserlatienda.dto.servicio.EstadisticasMensualDTO;
import com.dispenserlatienda.dto.servicio.SueldoProgressDTO;
import com.dispenserlatienda.dto.servicio.TecnicoRendimientoDTO;
import com.dispenserlatienda.repository.venta.VentaRepository;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.TreeMap;

import com.dispenserlatienda.domain.servicio.*;
import com.dispenserlatienda.domain.usuario.Usuario;
import com.dispenserlatienda.dto.servicio.*;
import com.dispenserlatienda.exception.BusinessException;
import com.dispenserlatienda.exception.ResourceNotFoundException;
import com.dispenserlatienda.repository.common.ConfiguracionGlobalRepository;
import com.dispenserlatienda.repository.equipo.EquipoRepository;
import com.dispenserlatienda.repository.orden.OrdenVisitaRepository;
import com.dispenserlatienda.repository.gasto.GastoRepository;
import com.dispenserlatienda.repository.sede.SedeRepository;
import com.dispenserlatienda.repository.servicio.ServicioRepository;
import com.dispenserlatienda.repository.usuario.UsuarioRepository;
import com.dispenserlatienda.repository.repuesto.RepuestoRepository;
import com.dispenserlatienda.domain.repuesto.Repuesto;
import com.dispenserlatienda.domain.notificacion.TipoNotificacion;
import com.dispenserlatienda.service.notificacion.NotificacionService;
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
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
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
    private static final Logger log = LoggerFactory.getLogger(ServicioService.class);
    private final ServicioRepository servicioRepository;
    private final SedeRepository sedeRepository;
    private final UsuarioRepository usuarioRepository;
    private final EquipoRepository equipoRepository;
    private final GastoRepository gastoRepository;
    private final ConfiguracionGlobalRepository configRepo;
    private final VentaRepository ventaRepository;
    private final ObjectMapper objectMapper;
    private final NotificacionService notificacionService;
    private final RepuestoRepository repuestoRepository;
    private final OrdenVisitaRepository ordenVisitaRepository;
    public ServicioService(ServicioRepository servicioRepository, SedeRepository sedeRepository,
                           UsuarioRepository usuarioRepository, EquipoRepository equipoRepository,
                           GastoRepository gastoRepository, ConfiguracionGlobalRepository configRepo,
                           VentaRepository ventaRepository, ObjectMapper objectMapper,
                           NotificacionService notificacionService, RepuestoRepository repuestoRepository,
                           OrdenVisitaRepository ordenVisitaRepository) {
        this.servicioRepository = servicioRepository;
        this.sedeRepository = sedeRepository;
        this.usuarioRepository = usuarioRepository;
        this.equipoRepository = equipoRepository;
        this.gastoRepository = gastoRepository;
        this.configRepo = configRepo;
        this.ventaRepository = ventaRepository;
        this.objectMapper = objectMapper;
        this.notificacionService = notificacionService;
        this.repuestoRepository = repuestoRepository;
        this.ordenVisitaRepository = ordenVisitaRepository;
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
        Pageable safePageable = PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(),
                agregarDesempatePorId(pageable.getSort()));
        return servicioRepository.findAll(buildSpec(tipoStr, estadoStr, busqueda, desde, hasta, usuarioId, clienteId), safePageable)
                .map(this::mapToDTO);
    }

    // Bug real (reportado 7-sep): la lista "bailaba" entre recargas -- dos servicios
    // con la misma fechaServicio (muy común, se crean varios el mismo día) no tenían
    // ningún criterio de desempate, así que Postgres podía devolverlos en cualquier
    // orden relativo de una consulta a otra, aunque nada hubiera cambiado. Se agrega
    // "id" como segundo criterio, en la misma dirección que el orden elegido, para
    // que el orden quede siempre determinístico -- mismo criterio de coherencia que
    // ya usa Presupuestos (desempata por id en el frontend, PresupuestosManager.jsx).
    private Sort agregarDesempatePorId(Sort sortOriginal) {
        Sort.Direction direccion = sortOriginal.stream().findFirst()
                .map(Sort.Order::getDirection).orElse(Sort.Direction.DESC);
        Sort nuevoSort = Sort.unsorted();
        for (Sort.Order order : sortOriginal) {
            if (order.getProperty().equals("total")) {
                // @Formula fields no están en el metamodel de JPA — Spring Data falla al
                // resolver "total"; JpaSort.unsafe() bypasea esa validación y pasa la
                // expresión directo a la query
                nuevoSort = nuevoSort.and(JpaSort.unsafe(order.getDirection(), "total"));
            } else {
                nuevoSort = nuevoSort.and(Sort.by(order));
            }
        }
        if (sortOriginal.stream().noneMatch(o -> o.getProperty().equals("id"))) {
            nuevoSort = nuevoSort.and(Sort.by(direccion, "id"));
        }
        return nuevoSort;
    }

    // Stats resumen para el panel (totalMes, hoy, pendientes, ganancia MO)
    @Transactional(readOnly = true)
    public ServicioResumenDTO calcularResumen(String tipoStr) {
        LocalDate hoy       = LocalDate.now();
        LocalDate inicioMes = hoy.withDayOfMonth(1);
        LocalDate finMes    = inicioMes.plusMonths(1).minusDays(1);

        // Cobrados + Realizados (legacy) = servicios finalizados
        List<Servicio> cobrados = servicioRepository.findAll(
                buildSpec(tipoStr, "COBRADO", null, null, null, null, null));
        List<Servicio> realizadosLegacy = servicioRepository.findAll(
                buildSpec(tipoStr, "REALIZADO", null, null, null, null, null));
        List<Servicio> realizados = new ArrayList<>(cobrados);
        realizados.addAll(realizadosLegacy);
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
            if (estadoStr != null && !estadoStr.isBlank()) {
                if (estadoStr.contains(",")) {
                    List<EstadoServicio> estados = java.util.Arrays.stream(estadoStr.split(","))
                            .map(String::trim).map(EstadoServicio::valueOf)
                            .collect(java.util.stream.Collectors.toList());
                    predicates.add(root.get("estado").in(estados));
                } else {
                    predicates.add(cb.equal(root.get("estado"), EstadoServicio.valueOf(estadoStr)));
                }
            }
            if (busqueda != null && !busqueda.isBlank()) {
                // JOIN items→equipo para buscar por número de serie
                jakarta.persistence.criteria.Join<Object,Object> items  = root.join("items",  jakarta.persistence.criteria.JoinType.LEFT);
                jakarta.persistence.criteria.Join<Object,Object> equipo = items.join("equipo", jakarta.persistence.criteria.JoinType.LEFT);
                query.distinct(true);
                // Búsqueda multi-término: "ma nicolas" o "ma+nicolas" → cada palabra tiene
                // que aparecer en algún campo (AND entre palabras, OR entre campos).
                for (String termino : busqueda.trim().split("[\\s+]+")) {
                    if (termino.isBlank()) continue;
                    // Sin importar acentos (3-oct-2026): "guemes" encuentra "Güemes".
                    String like = "%" + sinAcentos(termino.toLowerCase()) + "%";
                    java.util.function.Function<jakarta.persistence.criteria.Expression<String>, jakarta.persistence.criteria.Expression<String>> norm =
                            e -> cb.function("translate", String.class, cb.lower(cb.coalesce(e, "")),
                                    cb.literal("áéíóúüñàèìòùâêîôû"), cb.literal("aeiouunaeiouaeiou"));
                    List<Predicate> matchTexto = new ArrayList<>(List.of(
                            cb.like(norm.apply(root.<String>get("clienteNombre")), like),
                            cb.like(norm.apply(root.<String>get("sedeNombre")), like),
                            cb.like(norm.apply(equipo.<String>get("numeroSerie")), like),
                            cb.like(norm.apply(equipo.<String>get("ubicacion")), like),
                            cb.like(norm.apply(equipo.<String>get("modelo")), like)
                    ));
                    // Buscar "123" o "#123" también matchea el id que se muestra como "#123".
                    String soloNumero = termino.replaceFirst("^#", "");
                    if (soloNumero.matches("\\d+")) {
                        try {
                            matchTexto.add(cb.equal(root.get("id"), Long.parseLong(soloNumero)));
                        } catch (NumberFormatException ignored) { /* numero demasiado largo, se ignora */ }
                    }
                    predicates.add(cb.or(matchTexto.toArray(new Predicate[0])));
                }
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

    // Rendimiento mensual del técnico. Misma cuenta que la liquidación:
    // cobrado − productos − impuestos (solo con factura) = neto → 50% técnico.
    @Transactional(readOnly = true)
    public List<TecnicoRendimientoDTO> rendimientoTecnico(Long tecnicoId) {
        final java.math.RoundingMode RM = java.math.RoundingMode.HALF_UP;
        final BigDecimal pctImp = BigDecimal.valueOf(pctImpuestosConfig());
        List<Servicio> realizados = servicioRepository.findAll(
                buildSpec(null, "COBRADO,REALIZADO", null, null, null, tecnicoId, null));

        // [0]=cobrado [1]=productos [2]=impuestos [3]=neto
        Map<YearMonth, BigDecimal[]> porMes  = new TreeMap<>();
        Map<YearMonth, Integer>      countMes = new TreeMap<>();
        for (Servicio s : realizados) {
            if (s.getFechaServicio() == null) continue;
            YearMonth ym = YearMonth.from(s.getFechaServicio());
            Desglose d = desglose(s, pctImp);
            porMes.merge(ym, new BigDecimal[]{ d.cobrado(), d.productos(), d.impuestos(), d.neto() },
                    (x, y) -> new BigDecimal[]{ x[0].add(y[0]), x[1].add(y[1]), x[2].add(y[2]), x[3].add(y[3]) });
            countMes.merge(ym, 1, Integer::sum);
        }

        return porMes.entrySet().stream()
                .sorted(Map.Entry.<YearMonth, BigDecimal[]>comparingByKey().reversed())
                .map(e -> {
                    BigDecimal[] v = e.getValue();
                    return new TecnicoRendimientoDTO(
                            e.getKey().toString(),
                            countMes.getOrDefault(e.getKey(), 0),
                            v[0], v[2], v[1], v[3], v[3].divide(BigDecimal.valueOf(2), 2, RM));
                })
                .collect(java.util.stream.Collectors.toList());
    }

    // Rendimiento del mes — todos los técnicos — vista admin
    @Transactional(readOnly = true)
    public List<TecnicoResumenMesDTO> rendimientoMesActual(String mesParam, Long tecnicoId) {
        final java.math.RoundingMode RM = java.math.RoundingMode.HALF_UP;
        final BigDecimal pctImp = BigDecimal.valueOf(pctImpuestosConfig());
        YearMonth mes = (mesParam != null && !mesParam.isBlank()) ? YearMonth.parse(mesParam) : YearMonth.now();
        String desde = mes.atDay(1).toString();
        String hasta  = mes.atEndOfMonth().toString();

        List<Servicio> realizados = servicioRepository.findAll(
                buildSpec(null, "COBRADO,REALIZADO", null, desde, hasta, tecnicoId, null));

        Map<Long, List<Servicio>> porTecnico = new LinkedHashMap<>();
        Map<Long, String>         nombres    = new LinkedHashMap<>();
        for (Servicio s : realizados) {
            if (s.getUsuario() == null) continue;
            Long uid = s.getUsuario().getId();
            porTecnico.computeIfAbsent(uid, k -> new ArrayList<>()).add(s);
            nombres.putIfAbsent(uid, s.getUsuario().getNombre());
        }

        return porTecnico.entrySet().stream().map(e -> {
            BigDecimal cob = BigDecimal.ZERO, prod = BigDecimal.ZERO, imp = BigDecimal.ZERO, neto = BigDecimal.ZERO;
            for (Servicio s : e.getValue()) {
                Desglose d = desglose(s, pctImp);
                cob = cob.add(d.cobrado()); prod = prod.add(d.productos());
                imp = imp.add(d.impuestos()); neto = neto.add(d.neto());
            }
            return new TecnicoResumenMesDTO(e.getKey(), nombres.get(e.getKey()), mes.toString(),
                    e.getValue().size(), cob, imp, prod, neto, neto.divide(BigDecimal.valueOf(2), 2, RM));
        })
        .sorted(Comparator.comparing(TecnicoResumenMesDTO::totalFacturado).reversed())
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

    // ── Blindaje del técnico (4-oct-2026) ─────────────────────────────────────
    // Lo que un técnico puede cambiar de un trabajo: el texto, las fotos, cómo le
    // pagaron y agregar repuestos del catálogo. Los precios, el descuento, los
    // costos internos, el cliente y la sede quedan como los dejó el admin.
    private static final java.util.Set<EstadoServicio> ESTADOS_TECNICO =
            java.util.EnumSet.of(EstadoServicio.COMPLETADO, EstadoServicio.COBRADO);

    public void validarEstadoTecnico(String estado, String modalidadCobro) {
        EstadoServicio e;
        try { e = EstadoServicio.valueOf(estado); }
        catch (Exception ex) { throw new org.springframework.security.access.AccessDeniedException("Estado no permitido"); }
        if (!ESTADOS_TECNICO.contains(e)) {
            throw new org.springframework.security.access.AccessDeniedException("Ese paso lo hace el admin");
        }
        if (e == EstadoServicio.COBRADO && !"EFECTIVO_SIN_FACTURA".equals(modalidadCobro)) {
            throw new org.springframework.security.access.AccessDeniedException("Solo podés marcar cobrado en efectivo");
        }
    }

    @Transactional
    public ServicioDTO actualizarComoTecnico(Long id, ServicioCreateDTO dto, Usuario tecnico) {
        Servicio actual = servicioRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("No existe el servicio con ID: " + id));
        validarCambioTecnico(id, dto.getEstado(), dto.getModalidadCobro());

        List<ServicioItemCreateDTO> recibidos = dto.getItems() != null ? dto.getItems() : List.of();
        List<ServicioItemCreateDTO> items = new ArrayList<>();
        List<ServicioItem> existentes = actual.getItems();
        for (int i = 0; i < existentes.size(); i++) {
            ServicioItem ex = existentes.get(i);
            ServicioItemCreateDTO rec = i < recibidos.size() ? recibidos.get(i) : null;
            List<RepuestoUsadoDTO> reps = new ArrayList<>();
            try {
                if (ex.getRepuestosUsados() != null && !ex.getRepuestosUsados().isBlank())
                    reps.addAll(objectMapper.readValue(ex.getRepuestosUsados(), new TypeReference<List<RepuestoUsadoDTO>>(){}));
            } catch (JsonProcessingException e) { log.warn("Error leyendo repuestos: {}", e.getMessage()); }
            // Repuestos nuevos: los que vienen después de los que ya tenía, con precio del catálogo
            if (rec != null && rec.repuestosUsados() != null && rec.repuestosUsados().size() > reps.size()) {
                for (RepuestoUsadoDTO r : rec.repuestosUsados().subList(reps.size(), rec.repuestosUsados().size())) {
                    if (r.id() == null) continue;
                    Repuesto cat = repuestoRepository.findById(r.id()).orElse(null);
                    if (cat == null) continue;
                    int cant = r.cantidad() != null && r.cantidad() > 0 ? r.cantidad() : 1;
                    BigDecimal precio = cat.getPrecio() != null ? cat.getPrecio() : BigDecimal.ZERO;
                    reps.add(new RepuestoUsadoDTO(cat.getId(), cat.getNombre(), cat.getSku(), null, null, cant,
                            precio, precio.multiply(BigDecimal.valueOf(cant)), cat.getCosto(), cat.getPorcentajeGanancia()));
                }
            }
            String serial = ex.getEquipo() != null ? ex.getEquipo().getNumeroSerie() : "MOSTRADOR";
            items.add(new ServicioItemCreateDTO(
                    serial,
                    ex.getTecnico() != null ? ex.getTecnico() : tecnico.getNombre(),
                    ex.getCosto() != null ? ex.getCosto() : BigDecimal.ZERO,
                    ex.getCostoExtra(),
                    reps,
                    ex.getCostoInterno(),
                    null,
                    rec != null && rec.metodoPago() != null ? rec.metodoPago()
                            : (ex.getMetodoPago() != null ? ex.getMetodoPago().name() : "EFECTIVO"),
                    rec != null && rec.trabajoRealizado() != null ? rec.trabajoRealizado() : ex.getTrabajoRealizado(),
                    ex.getGarantiaHasta() != null ? ex.getGarantiaHasta().toString() : null,
                    rec != null && rec.trabajoTipo() != null ? rec.trabajoTipo() : TrabajoTipo.REPARACION,
                    rec != null && rec.fotoAntes() != null ? rec.fotoAntes() : ex.getFotoAntes(),
                    rec != null && rec.fotoDespues() != null ? rec.fotoDespues() : ex.getFotoDespues()));
        }

        ServicioCreateDTO limpio = new ServicioCreateDTO();
        // Venta vieja sin sede: se usa la que mande el frontend (5-oct-2026)
        limpio.setSedeId(actual.getSede() != null ? actual.getSede().getId() : dto.getSedeId());
        limpio.setUsuarioId(tecnico.getId());
        limpio.setFecha(actual.getFechaServicio() != null ? actual.getFechaServicio().toString() : dto.getFecha());
        limpio.setServicioTipo(actual.getServicioTipo());
        limpio.setClienteNombre(actual.getClienteNombre());
        limpio.setSedeNombre(dto.getSedeNombre());
        limpio.setObservaciones(dto.getObservaciones());
        limpio.setItems(items);
        limpio.setEstado(dto.getEstado());
        limpio.setFotoRemito(dto.getFotoRemito() != null ? dto.getFotoRemito() : actual.getFotoRemito());
        limpio.setDescuentoPorcentaje(actual.getDescuentoPorcentaje());
        limpio.setPresupuestoOrigenId(actual.getPresupuestoOrigenId());
        limpio.setOrdenId(actual.getOrdenId());
        if ("COBRADO".equals(dto.getEstado())) {
            limpio.setModalidadCobro("EFECTIVO_SIN_FACTURA");
            limpio.setMontoFinal(dto.getMontoFinal());
        }
        limpio.setEsVisita(actual.getEsVisita());
        limpio.setAbonoVisita(actual.getAbonoVisita());
        limpio.setPresupuestoVisitaId(actual.getPresupuestoVisitaId());
        limpio.setDuracionMinutos(actual.getDuracionMinutos());
        limpio.setAceptaTerminos(actual.getAceptaTerminos());
        limpio.setFechaTentativa(false);

        actual.getItems().clear();
        return procesarGuardado(actual, limpio);
    }

    // Un técnico crea un trabajo solo al cerrar una visita suya sin presupuesto
    @Transactional
    public ServicioDTO crearComoTecnico(ServicioCreateDTO dto, Usuario tecnico) {
        validarEstadoTecnico(dto.getEstado(), dto.getModalidadCobro());
        // Siempre desde una visita suya (5-oct-2026): la carga suelta por N/S pasó al admin.
        if (dto.getOrdenId() == null || !ordenVisitaRepository.existsByIdAndTecnicoId(dto.getOrdenId(), tecnico.getId())) {
            throw new org.springframework.security.access.AccessDeniedException("Solo podés cargar trabajos de tus visitas");
        }
        // Testeo integral 7-oct-2026 (C1): la visita tiene que estar abierta y el lugar
        // tiene que ser del cliente de esa visita (antes podía cargar trabajos, con el
        // monto que quisiera, en la sede de cualquier cliente).
        com.dispenserlatienda.domain.orden.OrdenVisita orden = ordenVisitaRepository.findById(dto.getOrdenId()).orElseThrow();
        if (!com.dispenserlatienda.service.seguridad.TecnicoAccesoService.ABIERTAS.contains(orden.getEstado())) {
            throw new BusinessException("VISITA_CERRADA", "Esta visita ya no está abierta");
        }
        Long clienteOrden = orden.getClienteId();
        if (clienteOrden == null && orden.getPresupuestoId() != null) {
            clienteOrden = servicioRepository.findById(orden.getPresupuestoId())
                .map(Servicio::getSede).filter(java.util.Objects::nonNull)
                .map(sd -> sd.getCliente() != null ? sd.getCliente().getId() : null).orElse(null);
        }
        Sede sedeDto = dto.getSedeId() != null ? sedeRepository.findById(dto.getSedeId()).orElse(null) : null;
        boolean sedeOk = sedeDto != null && (com.dispenserlatienda.service.seguridad.TecnicoAccesoService.esMostrador(sedeDto)
            || (sedeDto.getCliente() != null && clienteOrden != null && clienteOrden.equals(sedeDto.getCliente().getId())));
        if (!sedeOk) {
            throw new org.springframework.security.access.AccessDeniedException("Ese lugar no es del cliente de la visita");
        }
        if (orden.getClienteNombre() != null && !orden.getClienteNombre().isBlank()) dto.setClienteNombre(orden.getClienteNombre());
        dto.setUsuarioId(tecnico.getId());
        dto.setDescuentoPorcentaje(null);
        if (!"COBRADO".equals(dto.getEstado())) { dto.setModalidadCobro(null); dto.setMontoFinal(null); }
        // Sin costos internos ni precios de repuestos inventados: van del catálogo
        List<ServicioItemCreateDTO> items = new ArrayList<>();
        for (ServicioItemCreateDTO it : dto.getItems()) {
            List<RepuestoUsadoDTO> reps = new ArrayList<>();
            if (it.repuestosUsados() != null) for (RepuestoUsadoDTO r : it.repuestosUsados()) {
                if (r.id() == null) continue;
                Repuesto cat = repuestoRepository.findById(r.id()).orElse(null);
                if (cat == null) continue;
                int cant = r.cantidad() != null && r.cantidad() > 0 ? r.cantidad() : 1;
                BigDecimal precio = cat.getPrecio() != null ? cat.getPrecio() : BigDecimal.ZERO;
                reps.add(new RepuestoUsadoDTO(cat.getId(), cat.getNombre(), cat.getSku(), null, null, cant,
                        precio, precio.multiply(BigDecimal.valueOf(cant)), cat.getCosto(), cat.getPorcentajeGanancia()));
            }
            items.add(new ServicioItemCreateDTO(it.equipoSerial(), tecnico.getNombre(), it.costo(), null, reps, null, null,
                    it.metodoPago(), it.trabajoRealizado(), null, it.trabajoTipo(), it.fotoAntes(), it.fotoDespues()));
        }
        dto.setItems(items);
        return procesarGuardado(new Servicio(), dto);
    }

    // Puede el técnico tocar este servicio? Es suyo, o se lo asignaron con una orden.
    public boolean tecnicoPuedeTocar(Long servicioId, Long tecnicoId) {
        Servicio s = servicioRepository.findById(servicioId).orElse(null);
        if (s == null) return false;
        if (s.getUsuario() != null && s.getUsuario().getId().equals(tecnicoId)) return true;
        // Solo con una visita ABIERTA (7-oct-2026): antes una visita cancelada o que
        // pasó a otro técnico le seguía dando acceso al trabajo para siempre.
        return ordenVisitaRepository.existsByPresupuestoIdAndTecnicoIdAndEstadoIn(servicioId, tecnicoId,
                com.dispenserlatienda.service.seguridad.TecnicoAccesoService.ABIERTAS);
    }

    // De qué estado puede partir un cambio hecho por el técnico (7-oct-2026, C1):
    // un trabajo ya facturado, cobrado, cancelado o archivado no lo toca.
    private static final java.util.Set<EstadoServicio> ORIGEN_TECNICO = java.util.EnumSet.of(
            EstadoServicio.PRESUPUESTO, EstadoServicio.APROBADO, EstadoServicio.EN_PROGRESO, EstadoServicio.COMPLETADO);

    public void validarCambioTecnico(Long servicioId, String estado, String modalidadCobro) {
        validarEstadoTecnico(estado, modalidadCobro);
        Servicio s = servicioRepository.findById(servicioId)
                .orElseThrow(() -> new ResourceNotFoundException("No existe el servicio con ID: " + servicioId));
        if (!ORIGEN_TECNICO.contains(s.getEstado())) {
            throw new org.springframework.security.access.AccessDeniedException("Este trabajo ya está cerrado: lo maneja el admin");
        }
    }

    // Quita costos internos (costo de repuestos, % ganancia, costo interno) de lo que ve un técnico
    public ServicioDTO sinCostos(ServicioDTO d) {
        if (d == null) return d;
        List<ServicioItemDTO> items = d.items() == null ? null : d.items().stream().map(i -> new ServicioItemDTO(
                i.equipoId(), i.equipoSerial(), i.equipoModelo(), i.equipoUbicacion(), i.equipoPiso(), i.equipoSector(),
                i.tecnico(), i.costo(), i.costoExtra(), null, i.descuento(), i.metodoPago(), i.trabajoRealizado(),
                i.garantiaHasta(),
                i.repuestosUsados() == null ? null : i.repuestosUsados().stream().map(r -> new RepuestoUsadoDTO(
                        r.id(), r.nombre(), r.sku(), r.descripcion(), r.fotoUrl(), r.cantidad(), r.precio(), r.subtotal(),
                        null, null)).toList(),
                i.fotoAntes(), i.fotoDespues())).toList();
        // Sin teléfono ni mail del cliente para el técnico (5-oct-2026)
        return new ServicioDTO(d.id(), d.fecha(), d.servicioTipo(), d.clienteId(), d.clienteNombre(), null,
                null, null, d.clienteCondicionIva(), d.sedeId(), d.sedeNombre(), d.sedeDireccion(),
                items, d.estado(), d.fotoRemito(), d.descuentoPorcentaje(), d.observaciones(), d.nroDocumento(),
                d.usuarioId(), d.usuarioNombre(), d.modificadoPorNombre(), d.fechaModificacion(), d.presupuestoOrigenId(),
                d.modalidadCobro(), d.montoFinal(), d.fechaCompletado(), d.fechaFacturacion(), d.fechaCobro(),
                d.datosBancariosEnviados(), d.esVisita(), d.abonoVisita(), d.presupuestoVisitaId(), d.duracionMinutos(),
                d.aceptaTerminos(), d.fechaTentativa(), d.ventanasDisponibles(), d.horaServicio(), d.enEspera());
    }

    private ServicioDTO procesarGuardado(Servicio servicio, ServicioCreateDTO dto) {
        Sede sede = sedeRepository.findById(dto.getSedeId())
                .orElseThrow(() -> new ResourceNotFoundException("Sede no encontrada"));

        // Ahora lanzamos excepción si usuario no existe (en lugar de usar .get(0))
        Usuario usuario = usuarioRepository.findById(dto.getUsuarioId())
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado con ID: " + dto.getUsuarioId()));

        boolean esNuevo = servicio.getId() == null;
        Long usuarioAnteriorId = servicio.getUsuario() != null ? servicio.getUsuario().getId() : null;
        java.time.LocalDate fechaAnterior = servicio.getFechaServicio();
        String horaAnterior = servicio.getHoraServicio();
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
        servicio.setDuracionMinutos(dto.getDuracionMinutos());
        servicio.setAceptaTerminos(dto.getAceptaTerminos());
        // Fecha tentativa: si viene marcada, guardamos las ventanas permitidas
        // y dejamos hora_servicio en null hasta que el tecnico la confirme
        // (confirmarHorario mas abajo). Si no es tentativa, se limpia por si
        // una edicion posterior la desactiva.
        boolean esTentativa = Boolean.TRUE.equals(dto.getFechaTentativa());
        servicio.setFechaTentativa(esTentativa);
        servicio.setVentanasDisponibles(esTentativa ? dto.getVentanasDisponibles() : null);
        if (dto.getPresupuestoOrigenId() != null) {
            servicio.setPresupuestoOrigenId(dto.getPresupuestoOrigenId());
        }
        if (dto.getOrdenId() != null) {
            servicio.setOrdenId(dto.getOrdenId());
        }
        // Campos de cobro
        if (dto.getModalidadCobro() != null && !dto.getModalidadCobro().isEmpty()) {
            try {
                servicio.setModalidadCobro(ModalidadCobro.valueOf(dto.getModalidadCobro()));
            } catch (IllegalArgumentException e) { log.warn("Valor invalido: {}", e.getMessage()); }
        }
        if (dto.getMontoFinal() != null) servicio.setMontoFinal(dto.getMontoFinal());
        if (dto.getEsVisita() != null) servicio.setEsVisita(dto.getEsVisita());
        if (dto.getAbonoVisita() != null) servicio.setAbonoVisita(dto.getAbonoVisita());
        if (dto.getPresupuestoVisitaId() != null) servicio.setPresupuestoVisitaId(dto.getPresupuestoVisitaId());
        // Auto-setear fechas según estado
        EstadoServicio est = servicio.getEstado();
        if (est == EstadoServicio.COMPLETADO && servicio.getFechaCompletado() == null) {
            servicio.setFechaCompletado(LocalDateTime.now());
        }
        if (est == EstadoServicio.COBRADO && servicio.getFechaCobro() == null) {
            servicio.setFechaCobro(LocalDateTime.now());
        }

        ServicioTipo tipoDetectado = ServicioTipo.VENTA;

        for (var itemDto : dto.getItems()) {
            if (itemDto.equipoSerial() != null && !itemDto.equipoSerial().equalsIgnoreCase("MOSTRADOR")) {
                tipoDetectado = ServicioTipo.TECNICA;
            }

            Equipo equipo = equipoRepository.findFirstByNumeroSerie(Equipo.normalizarSerie(itemDto.equipoSerial())).orElse(null);

            // Un N/S es único en todo el sistema: si ya pertenece a otro cliente no se
            // engancha a este servicio (antes se mezclaba el historial entre clientes).
            if (equipo != null && perteneceAOtroCliente(equipo, servicio)) {
                throw new BusinessException("EQUIPO_DE_OTRO_CLIENTE",
                        "El N/S " + itemDto.equipoSerial() + " ya está registrado en otro cliente. Usá otro número.");
            }

            // Garantia: 3 meses desde la fecha del servicio, para todo item con equipo real (no MOSTRADOR),
            // una vez que el servicio queda REALIZADO. Se calcula siempre en el backend para que aplique
            // sin importar si el servicio se cerro directo ("Cobrar ahora") o via aprobacion de presupuesto.
            boolean tieneEquipoItem = itemDto.equipoSerial() != null && !itemDto.equipoSerial().equalsIgnoreCase("MOSTRADOR");
            LocalDate fechaGarantia = (servicio.getEstado() == EstadoServicio.REALIZADO && tieneEquipoItem)
                    ? servicio.getFechaServicio().plusMonths(3)
                    : null;

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
            } catch (JsonProcessingException e) { log.warn("Error serializando JSON: {}", e.getMessage()); }

            servicio.addItem(nuevoItem);
        }

        servicio.setServicioTipo(tipoDetectado);

        descontarStockSiCorresponde(servicio);
        Servicio saved = servicioRepository.save(servicio);

        // El auto-despacho de ordenes lo maneja el frontend (CerrarTicketSheet)
        // con fecha obligatoria. No crear orden aquí para evitar duplicados.

        // Mismo cierre de órdenes que en cambiarEstado(): el técnico confirma el trabajo
        // con un PUT (EjecutarOrdenSheet) y si salía de la pantalla antes del último
        // botón, la orden quedaba abierta para siempre.
        if (saved.getId() != null) {
            if (esEstadoTrabajoTerminado(saved.getEstado()) && saved.isEnEspera()) {
                saved.setEnEspera(false);
                saved = servicioRepository.save(saved);
            }
            if (esEstadoTrabajoTerminado(saved.getEstado())) {
                ordenVisitaRepository.completarActivasDePresupuesto(saved.getId());
            } else if (saved.getEstado() == EstadoServicio.ARCHIVADO || saved.getEstado() == EstadoServicio.CANCELADO) {
                ordenVisitaRepository.cancelarActivasDePresupuesto(saved.getId());
            }
        }

        // Notificaciones de asignación (29-sep-2026, "se repiten"): una asignación = UN
        // aviso, y lo manda la ORDEN (OrdenVisitaService.crear), que es lo que el técnico
        // trabaja. Antes el presupuesto avisaba "Nuevo trabajo asignado" y un segundo
        // después la orden avisaba "Nueva orden" → dos pushes y dos WhatsApp por lo mismo.
        // Acá solo queda la REASIGNACIÓN: la orden abierta pasa al técnico nuevo (antes
        // quedaba en la agenda del anterior) y se avisa una sola vez.
        boolean seReasigno = !esNuevo && usuarioAnteriorId != null && !usuarioAnteriorId.equals(usuario.getId());
        List<com.dispenserlatienda.domain.orden.EstadoOrden> ACTIVAS = List.of(
                com.dispenserlatienda.domain.orden.EstadoOrden.PENDIENTE,
                com.dispenserlatienda.domain.orden.EstadoOrden.EN_CAMINO,
                com.dispenserlatienda.domain.orden.EstadoOrden.EN_SITIO);
        String detalle = (saved.getClienteNombre() != null ? saved.getClienteNombre() : "")
                + (saved.getSedeNombre() != null ? " · " + saved.getSedeNombre() : "");
        if (seReasigno && saved.getServicioTipo() == ServicioTipo.TECNICA) {
            int movidas = ordenVisitaRepository.reasignarActivasDePresupuesto(saved.getId(), usuario);
            // La referencia apunta a la visita (si hay) para que al tocar la notificación se abra (5-oct-2026)
            Long refOrden = movidas > 0 ? ordenVisitaRepository.findByPresupuestoIdAndEstadoIn(saved.getId(), ACTIVAS)
                    .stream().map(com.dispenserlatienda.domain.orden.OrdenVisita::getId).findFirst().orElse(null) : null;
            notificacionService.notificar(
                    movidas > 0 ? TipoNotificacion.ORDEN_ASIGNADA : TipoNotificacion.TRABAJO_ASIGNADO,
                    usuario.getId(), null,
                    "Te asignaron un trabajo", detalle, refOrden != null ? refOrden : saved.getId(), false);
        } else if (!esNuevo && saved.getServicioTipo() == ServicioTipo.TECNICA && saved.getFechaServicio() != null
                && (!java.util.Objects.equals(fechaAnterior, saved.getFechaServicio())
                    || !java.util.Objects.equals(horaAnterior, saved.getHoraServicio()))) {
            // Mismo técnico, otro día/hora (5-oct-2026): antes la visita del técnico
            // quedaba con la fecha vieja y no se enteraba. Se mueve y se le avisa.
            for (var o : ordenVisitaRepository.findByPresupuestoIdAndEstadoIn(saved.getId(), ACTIVAS)) {
                o.setFechaProgramada(saved.getFechaServicio());
                o.setHoraEstimada(saved.getHoraServicio());
                o.setConfirmadaEn(null); // tiene que volver a confirmar "Ok, voy"
                ordenVisitaRepository.save(o);
                if (o.getTecnico() != null) {
                    String cuando = saved.getFechaServicio().format(java.time.format.DateTimeFormatter.ofPattern("dd/MM"))
                            + (saved.getHoraServicio() != null && !saved.getHoraServicio().isBlank() ? " " + saved.getHoraServicio() : "");
                    notificacionService.notificar(TipoNotificacion.ORDEN_ASIGNADA, o.getTecnico().getId(), null,
                            "Cambió tu visita · " + (saved.getClienteNombre() != null ? saved.getClienteNombre() : ""),
                            "Antes era el " + (fechaAnterior != null ? fechaAnterior.format(java.time.format.DateTimeFormatter.ofPattern("dd/MM")) : "sin fecha") + (horaAnterior != null && !horaAnterior.isBlank() ? " " + horaAnterior : ""), o.getId(), false);
                }
            }
        }

        return mapToDTO(saved);
    }

    // Estados donde el trabajo tecnico ya se considera hecho (dispara el calculo de garantia).
    // Cubre tanto el estado legacy REALIZADO como los pasos del flujo moderno de Despacho.
    private static boolean esEstadoTrabajoTerminado(EstadoServicio e) {
        return e == EstadoServicio.REALIZADO
                || e == EstadoServicio.COMPLETADO
                || e == EstadoServicio.PENDIENTE_FACTURACION
                || e == EstadoServicio.FACTURADO
                || e == EstadoServicio.COBRADO;
    }

    // Bug real encontrado 6-sep (auditoria masiva 1-sep, critico #4): el stock
    // de un repuesto nunca se restaba al confirmar una venta ni un servicio con
    // repuestos usados -- "Productos" nunca reflejaba lo vendido/usado.
    //
    // Se descuenta una sola vez por servicio (guardia servicio.stockDescontado,
    // ver Servicio.java) apenas el servicio entra a un estado de "trabajo
    // terminado" -- mismo concepto que ya usa la garantia (esEstadoTrabajoTerminado).
    // El flag vive en Servicio y no en ServicioItem porque editar un servicio
    // borra y recrea sus items (ver actualizarServicio) -- un flag por item se
    // perderia en cada edicion y volveria a descontar de mas.
    //
    // A proposito, no bloquea ni valida stock insuficiente (puede quedar
    // negativo) -- eso es un problema aparte (falta validacion de cantidad
    // disponible, ya relevado por separado), y frenar el guardado del
    // servicio por stock insuficiente sin poder probarlo en vivo primero es
    // mas riesgo del que vale la pena correr en esta pasada.
    private void descontarStockSiCorresponde(Servicio servicio) {
        if (Boolean.TRUE.equals(servicio.getStockDescontado())) return;
        if (!esEstadoTrabajoTerminado(servicio.getEstado())) return;

        for (ServicioItem item : servicio.getItems()) {
            String json = item.getRepuestosUsados();
            if (json == null || json.isEmpty()) continue;
            try {
                List<RepuestoUsadoDTO> usados = objectMapper.readValue(json, new TypeReference<List<RepuestoUsadoDTO>>() {});
                for (RepuestoUsadoDTO r : usados) {
                    if (r.id() == null || r.cantidad() == null || r.cantidad() <= 0) continue;
                    repuestoRepository.findById(r.id()).ifPresent(repuesto -> {
                        int actual = repuesto.getStock() != null ? repuesto.getStock() : 0;
                        repuesto.setStock(actual - r.cantidad());
                        repuestoRepository.save(repuesto);
                    });
                }
            } catch (JsonProcessingException e) {
                log.warn("No se pudo leer repuestosUsados para descontar stock (servicio {}): {}", servicio.getId(), e.getMessage());
            }
        }
        servicio.setStockDescontado(true);
    }

    // Poner / sacar un presupuesto "en espera". Cierre sincronizado: al ponerlo en
    // espera se cancela la orden abierta del técnico (sale de su agenda) y vuelve a
    // PRESUPUESTO; al retomarlo queda "sin asignar", listo para despachar de nuevo.
    @Transactional
    public ServicioDTO marcarEnEspera(Long id, boolean enEspera) {
        Servicio s = servicioRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("No existe"));
        if (esEstadoTrabajoTerminado(s.getEstado()) || s.getEstado() == EstadoServicio.ARCHIVADO
                || s.getEstado() == EstadoServicio.CANCELADO) {
            throw new BusinessException("ESTADO_INVALIDO", "Solo un presupuesto pendiente o en curso puede ponerse en espera");
        }
        s.setEnEspera(enEspera);
        if (enEspera) {
            // Avisarle al técnico que esa visita ya no va (5-oct-2026: antes le quedaba "Cancelada" sin explicación)
            ordenVisitaRepository.findByPresupuestoIdAndEstadoIn(s.getId(), List.of(
                    com.dispenserlatienda.domain.orden.EstadoOrden.PENDIENTE,
                    com.dispenserlatienda.domain.orden.EstadoOrden.EN_CAMINO,
                    com.dispenserlatienda.domain.orden.EstadoOrden.EN_SITIO))
                .forEach(o -> { if (o.getTecnico() != null) notificacionService.notificar(
                    com.dispenserlatienda.domain.notificacion.TipoNotificacion.MENSAJE_LIBRE, o.getTecnico().getId(), null,
                    "Visita en pausa · " + (o.getClienteNombre() != null ? o.getClienteNombre() : o.getTitulo()),
                    "El admin la puso en espera: no vayas por ahora. Te avisa cuando se reprograme.", o.getId(), true); });
            ordenVisitaRepository.cancelarActivasDePresupuesto(s.getId());
            if (s.getEstado() == EstadoServicio.EN_PROGRESO) s.setEstado(EstadoServicio.PRESUPUESTO);
        }
        return mapToDTO(servicioRepository.save(s));
    }

    @Transactional
    public ServicioDTO cambiarEstado(Long id, String nuevoEstado, String modalidadCobro, BigDecimal montoFinal, String observaciones) {
        Servicio s = servicioRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("No existe"));

        EstadoServicio estado;
        try {
            estado = EstadoServicio.valueOf(nuevoEstado);
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Estado inválido: " + nuevoEstado);
        }
        s.setEstado(estado);

        // Modalidad de cobro
        if (modalidadCobro != null && !modalidadCobro.isEmpty()) {
            try { s.setModalidadCobro(ModalidadCobro.valueOf(modalidadCobro)); } catch (IllegalArgumentException e) { log.warn("Valor invalido: {}", e.getMessage()); }
        }
        if (montoFinal != null) s.setMontoFinal(montoFinal);
        if (observaciones != null) s.setObservaciones(observaciones);

        // Auto-setear fechas según transición
        if (estado == EstadoServicio.COMPLETADO && s.getFechaCompletado() == null) {
            s.setFechaCompletado(LocalDateTime.now());
        }
        if (estado == EstadoServicio.PENDIENTE_FACTURACION && s.getFechaCompletado() == null) {
            s.setFechaCompletado(LocalDateTime.now());
        }
        if (estado == EstadoServicio.FACTURADO && s.getFechaFacturacion() == null) {
            s.setFechaFacturacion(LocalDateTime.now());
            s.setDatosBancariosEnviados(true);
        }
        if (estado == EstadoServicio.COBRADO && s.getFechaCobro() == null) {
            s.setFechaCobro(LocalDateTime.now());
        }

        // Garantia: si el servicio pasa a un estado de "trabajo terminado" por esta via (aprobar presupuesto,
        // completar orden, facturar, cobrar, etc. — todo el flujo de Despacho pasa por aca ademas del REALIZADO
        // legacy), completar la garantia de 3 meses en los items que tengan equipo y todavia no la tengan cargada.
        // Queda anclada a la fecha del servicio (no a la fecha del cobro) y es idempotente: si ya se cargo en un
        // paso anterior de este mismo flujo (ej. al pasar a COMPLETADO), los pasos siguientes no la pisan.
        if (esEstadoTrabajoTerminado(estado)) {
            LocalDate fechaGarantia = (s.getFechaServicio() != null ? s.getFechaServicio() : LocalDate.now()).plusMonths(3);
            for (ServicioItem item : s.getItems()) {
                if (item.getEquipo() != null && item.getGarantiaHasta() == null) {
                    item.setGarantiaHasta(fechaGarantia);
                }
            }
        }

        // Un trabajo hecho, archivado o cancelado ya no está "en espera"
        if (esEstadoTrabajoTerminado(estado) || estado == EstadoServicio.ARCHIVADO || estado == EstadoServicio.CANCELADO) {
            s.setEnEspera(false);
        }

        // Cerrar la orden del técnico si el trabajo se cerró/archivó por fuera de ella
        if (esEstadoTrabajoTerminado(estado)) {
            ordenVisitaRepository.completarActivasDePresupuesto(s.getId());
        } else if (estado == EstadoServicio.ARCHIVADO || estado == EstadoServicio.CANCELADO) {
            ordenVisitaRepository.cancelarActivasDePresupuesto(s.getId());
        }

        descontarStockSiCorresponde(s);
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
            } catch (JsonProcessingException e) { log.warn("Error serializando JSON: {}", e.getMessage()); }

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
                s.getPresupuestoOrigenId(),
                s.getModalidadCobro() != null ? s.getModalidadCobro().name() : null,
                s.getMontoFinal(),
                s.getFechaCompletado() != null ? s.getFechaCompletado().toString() : null,
                s.getFechaFacturacion() != null ? s.getFechaFacturacion().toString() : null,
                s.getFechaCobro() != null ? s.getFechaCobro().toString() : null,
                s.getDatosBancariosEnviados(),
                s.getEsVisita(),
                s.getAbonoVisita(),
                s.getPresupuestoVisitaId(),
                s.getDuracionMinutos(),
                s.getAceptaTerminos(),
                s.getFechaTentativa(),
                s.getVentanasDisponibles(),
                s.getHoraServicio(),
                s.isEnEspera()
        );
    }

    // Mapa de nombres de dia (como los manda el frontend, en mayusculas sin
    // acentos) a java.time.DayOfWeek — para validar que la fecha elegida por
    // el tecnico caiga en un dia habilitado dentro de ventanasDisponibles.
    private static final Map<String, java.time.DayOfWeek> DIAS_SEMANA = Map.of(
            "LUNES", java.time.DayOfWeek.MONDAY,
            "MARTES", java.time.DayOfWeek.TUESDAY,
            "MIERCOLES", java.time.DayOfWeek.WEDNESDAY,
            "JUEVES", java.time.DayOfWeek.THURSDAY,
            "VIERNES", java.time.DayOfWeek.FRIDAY,
            "SABADO", java.time.DayOfWeek.SATURDAY,
            "DOMINGO", java.time.DayOfWeek.SUNDAY
    );

    // El tecnico asignado confirma dia y hora exactos dentro de la ventana que
    // el admin habilito (Servicio.ventanasDisponibles, JSON tipo
    // [{"dia":"MIERCOLES","franja":"10:00-12:00"}]). Se valida server-side
    // (no alcanza con que el frontend ya filtre las opciones) que la fecha
    // elegida caiga en uno de los dias/horarios permitidos.
    @Transactional
    public ServicioDTO confirmarHorario(Long id, String fechaStr, String horaStr) {
        Servicio s = servicioRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("No existe el servicio " + id));

        if (!Boolean.TRUE.equals(s.getFechaTentativa())) {
            throw new IllegalArgumentException("Este servicio no tiene una fecha tentativa pendiente de confirmar");
        }

        LocalDate fecha;
        java.time.LocalTime hora;
        try {
            fecha = LocalDate.parse(fechaStr);
            hora = java.time.LocalTime.parse(horaStr);
        } catch (Exception e) {
            throw new IllegalArgumentException("Fecha u hora invalida");
        }

        List<Map<String, String>> ventanas;
        try {
            ventanas = s.getVentanasDisponibles() != null
                    ? objectMapper.readValue(s.getVentanasDisponibles(), new TypeReference<List<Map<String, String>>>() {})
                    : List.of();
        } catch (JsonProcessingException e) {
            ventanas = List.of();
        }

        java.time.DayOfWeek diaElegido = fecha.getDayOfWeek();
        boolean dentroDeVentana = ventanas.stream().anyMatch(v -> {
            java.time.DayOfWeek diaVentana = DIAS_SEMANA.get(v.get("dia"));
            if (diaVentana != diaElegido) return false;
            String[] franja = (v.get("franja") != null ? v.get("franja") : "").split("-");
            if (franja.length != 2) return false;
            try {
                java.time.LocalTime desde = java.time.LocalTime.parse(franja[0].trim());
                java.time.LocalTime hasta = java.time.LocalTime.parse(franja[1].trim());
                return !hora.isBefore(desde) && hora.isBefore(hasta);
            } catch (Exception e) {
                return false;
            }
        });

        if (!dentroDeVentana) {
            throw new IllegalArgumentException("Ese dia/horario no esta dentro de la disponibilidad habilitada para este trabajo");
        }

        s.setFechaServicio(fecha);
        s.setHoraServicio(horaStr);
        s.setFechaTentativa(false);
        Servicio saved = servicioRepository.save(s);
        // Antes la orden del técnico se quedaba con la fecha vieja y sin hora
        ordenVisitaRepository.reprogramarActivasDePresupuesto(saved.getId(), fecha, horaStr);

        // Avisar al admin que asigno el trabajo — reusa el mismo tipo de
        // notificacion que ya se dispara al asignar (ver procesarGuardado):
        // aca el sentido es inverso (tecnico -> admin), pero el frontend ya
        // sabe mostrar TRABAJO_ASIGNADO con un icono/label genericos.
        if (s.getUsuario() != null) {
            List<Usuario> admins = usuarioRepository.findAll().stream()
                    .filter(u -> u.getRol() == com.dispenserlatienda.domain.usuario.RolUsuario.ADMIN && u.isActivo())
                    .toList();
            String detalle = (s.getClienteNombre() != null ? s.getClienteNombre() : "")
                    + " · " + fecha + " " + horaStr;
            for (Usuario admin : admins) {
                notificacionService.notificar(
                        TipoNotificacion.TRABAJO_ASIGNADO, admin.getId(), s.getUsuario().getId(),
                        "Horario confirmado", detalle, saved.getId(), false);
            }
        }

        return mapToDTO(saved);
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

        // Bug real (auditoria 1-sep, critico #7): antes no filtraba por estado --
        // mezclaba presupuestos no aprobados y servicios cancelados en el total del
        // mes, con tal de que la fecha cayera en rango. Mismo filtro de estado que
        // ya usa calcularMesSueldo/calcularGananciaNetaServicio (COBRADO + el legacy
        // REALIZADO) para que Balance y Sueldo/Tecnicos coincidan sobre que cuenta
        // como facturacion real.
        List<Servicio> serviciosMes = servicioRepository.findAll().stream()
                .filter(s -> s.getFechaServicio() != null
                        && !s.getFechaServicio().isBefore(inicioMes)
                        && !s.getFechaServicio().isAfter(finMes)
                        && (s.getEstado() == EstadoServicio.COBRADO || s.getEstado() == EstadoServicio.REALIZADO))
                .toList();

        BigDecimal facturacion = BigDecimal.ZERO;
        BigDecimal costoRepuestos = BigDecimal.ZERO;
        List<EstadisticasMensualDTO.TransaccionDTO> transacciones = new ArrayList<>();

        for (Servicio servicio : serviciosMes) {
            // Bug real (mismo hallazgo #7): el descuento se restaba desde
            // item.getDescuento(), un campo a nivel item que el frontend nunca
            // completa (siempre cero) -- el descuento real vive a nivel servicio
            // (descuentoPorcentaje), aplicado aca igual que en
            // calcularGananciaNetaServicio.
            BigDecimal descPct = servicio.getDescuentoPorcentaje();
            BigDecimal factorDescuento = (descPct != null && descPct.compareTo(BigDecimal.ZERO) > 0)
                    ? BigDecimal.ONE.subtract(descPct.divide(BigDecimal.valueOf(100), 4, java.math.RoundingMode.HALF_UP))
                    : BigDecimal.ONE;
            for (ServicioItem item : servicio.getItems()) {
                BigDecimal costoBase = item.getCosto() != null ? item.getCosto() : BigDecimal.ZERO;
                BigDecimal venta = costoBase
                        .add(item.getCostoExtra() != null ? item.getCostoExtra() : BigDecimal.ZERO)
                        .multiply(factorDescuento)
                        .setScale(2, java.math.RoundingMode.HALF_UP);

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
                    log.warn("Error calculando estadisticas: {}", e.getMessage());
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
                .map(g -> g.getMonto() != null ? g.getMonto() : BigDecimal.ZERO)
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

    // Calcular progreso de sueldo para un usuario en un mes dado
    // Admin (isAdmin=true): servicios propios 100%, servicios de otros 50% (parte empresa), + ventas
    // Técnico (isAdmin=false): su parte = 50% de sus servicios cobrados
    @Transactional(readOnly = true)
    public SueldoProgressDTO calcularProgresoSueldo(Long usuarioId, String mesParam, boolean isAdmin) {
        final BigDecimal PCT_IMPUESTOS = BigDecimal.valueOf(pctImpuestosConfig());
        final java.math.RoundingMode RM = java.math.RoundingMode.HALF_UP;

        Usuario usuario = usuarioRepository.findById(usuarioId)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado"));
        BigDecimal sueldoObjetivo = usuario.getSueldoObjetivo() != null ? usuario.getSueldoObjetivo() : BigDecimal.ZERO;

        YearMonth mesActual = (mesParam != null && !mesParam.isBlank()) ? YearMonth.parse(mesParam) : YearMonth.now();

        // Calcular un mes específico
        BigDecimal[] desglose = calcularMesSueldo(usuarioId, mesActual, PCT_IMPUESTOS, RM, isAdmin);
        BigDecimal ingresoServPropios = desglose[0];
        int cantServPropios = desglose[1].intValue();
        BigDecimal ingresoServTecnicos = desglose[2];
        int cantServTecnicos = desglose[3].intValue();

        // Ventas del mes (ganancia real = totalIngreso - subtotalCosto)
        LocalDate inicioMes = mesActual.atDay(1);
        LocalDate finMes = mesActual.atEndOfMonth();
        BigDecimal ingresoVentas = ventaRepository.sumGananciaByPeriodo(inicioMes, finMes);
        ingresoVentas = ingresoVentas != null ? ingresoVentas : BigDecimal.ZERO;
        long cantVentas = ventaRepository.countByPeriodo(inicioMes, finMes);

        BigDecimal totalAcumulado;
        if (isAdmin) {
            totalAcumulado = ingresoServPropios.add(ingresoServTecnicos).add(ingresoVentas);
        } else {
            totalAcumulado = ingresoServPropios; // técnico solo ve su parte
        }

        BigDecimal faltante = sueldoObjetivo.subtract(totalAcumulado).max(BigDecimal.ZERO);
        double porcentaje = sueldoObjetivo.compareTo(BigDecimal.ZERO) > 0
                ? totalAcumulado.divide(sueldoObjetivo, 4, RM).multiply(BigDecimal.valueOf(100)).doubleValue()
                : 0;

        // Resultado empresa (solo admin): acumulado - sueldo admin - gastos
        BigDecimal gastosOp = BigDecimal.ZERO;
        BigDecimal resultadoEmpresa = BigDecimal.ZERO;
        if (isAdmin) {
            List<Gasto> gastosMes = gastoRepository.findByFechaBetween(inicioMes, finMes);
            gastosOp = gastosMes.stream().map(g -> g.getMonto() != null ? g.getMonto() : BigDecimal.ZERO).reduce(BigDecimal.ZERO, BigDecimal::add);
            resultadoEmpresa = totalAcumulado.subtract(sueldoObjetivo).subtract(gastosOp);
        }

        // Evolución: últimos 6 meses
        List<SueldoProgressDTO.MesResumen> evolucion = new ArrayList<>();
        for (int i = 5; i >= 0; i--) {
            YearMonth ym = mesActual.minusMonths(i);
            BigDecimal[] ev = calcularMesSueldo(usuarioId, ym, PCT_IMPUESTOS, RM, isAdmin);
            BigDecimal acumEv;
            if (isAdmin) {
                LocalDate ini = ym.atDay(1);
                LocalDate fin = ym.atEndOfMonth();
                BigDecimal ventasEv = ventaRepository.sumGananciaByPeriodo(ini, fin);
                ventasEv = ventasEv != null ? ventasEv : BigDecimal.ZERO;
                acumEv = ev[0].add(ev[2]).add(ventasEv);
                List<Gasto> gastosEv = gastoRepository.findByFechaBetween(ini, fin);
                BigDecimal gastosEvT = gastosEv.stream().map(g -> g.getMonto() != null ? g.getMonto() : BigDecimal.ZERO).reduce(BigDecimal.ZERO, BigDecimal::add);
                BigDecimal resEv = acumEv.subtract(sueldoObjetivo).subtract(gastosEvT);
                evolucion.add(new SueldoProgressDTO.MesResumen(ym.toString(), acumEv, sueldoObjetivo, resEv,
                        ev[1].intValue() + ev[3].intValue()));
            } else {
                acumEv = ev[0];
                evolucion.add(new SueldoProgressDTO.MesResumen(ym.toString(), acumEv, sueldoObjetivo, BigDecimal.ZERO,
                        ev[1].intValue()));
            }
        }

        return new SueldoProgressDTO(
                mesActual.toString(), usuarioId, usuario.getNombre(), sueldoObjetivo,
                ingresoServPropios, cantServPropios,
                ingresoServTecnicos, cantServTecnicos,
                ingresoVentas, (int) cantVentas,
                totalAcumulado, faltante, porcentaje,
                resultadoEmpresa, gastosOp,
                evolucion
        );
    }

    // Calcula ingresos de un mes para sueldo
    // Retorna [ingresoServPropios, cantPropios, ingresoServTecnicos, cantTecnicos]
    private BigDecimal[] calcularMesSueldo(Long usuarioId, YearMonth ym,
                                            BigDecimal pctImp, java.math.RoundingMode rm, boolean isAdmin) {
        String desde = ym.atDay(1).toString();
        String hasta = ym.atEndOfMonth().toString();

        // Servicios propios (cobrados, asignados a este usuario)
        List<Servicio> propiosCobrados = servicioRepository.findAll(
                buildSpec(null, "COBRADO", null, desde, hasta, usuarioId, null));
        List<Servicio> propiosLegacy = servicioRepository.findAll(
                buildSpec(null, "REALIZADO", null, desde, hasta, usuarioId, null));
        List<Servicio> propios = new ArrayList<>(propiosCobrados);
        propios.addAll(propiosLegacy);

        BigDecimal ingresoPropios = BigDecimal.ZERO;
        for (Servicio s : propios) {
            BigDecimal ganNeta = calcularGananciaNetaServicio(s, pctImp, rm);
            if (isAdmin) {
                ingresoPropios = ingresoPropios.add(ganNeta); // 100% para admin
            } else {
                ingresoPropios = ingresoPropios.add(ganNeta.divide(BigDecimal.valueOf(2), 2, rm)); // 50% para técnico
            }
        }

        // Servicios de otros técnicos (solo admin recibe 50%)
        BigDecimal ingresoTecnicos = BigDecimal.ZERO;
        int cantTecnicos = 0;
        if (isAdmin) {
            List<Servicio> todosCobrados = servicioRepository.findAll(
                    buildSpec(null, "COBRADO", null, desde, hasta, null, null));
            List<Servicio> todosLegacy = servicioRepository.findAll(
                    buildSpec(null, "REALIZADO", null, desde, hasta, null, null));
            List<Servicio> todos = new ArrayList<>(todosCobrados);
            todos.addAll(todosLegacy);

            for (Servicio s : todos) {
                if (s.getUsuario() != null && !s.getUsuario().getId().equals(usuarioId)) {
                    BigDecimal ganNeta = calcularGananciaNetaServicio(s, pctImp, rm);
                    ingresoTecnicos = ingresoTecnicos.add(ganNeta.divide(BigDecimal.valueOf(2), 2, rm));
                    cantTecnicos++;
                }
            }
        }

        return new BigDecimal[]{
                ingresoPropios, BigDecimal.valueOf(propios.size()),
                ingresoTecnicos, BigDecimal.valueOf(cantTecnicos)
        };
    }

    // ── Desglose único de un trabajo (4-oct-2026) ─────────────────────────────
    // Lo usan la liquidación, el sueldo y el rendimiento, para que los números
    // coincidan en todas las pantallas.
    //   cobrado   = montoFinal si está cargado; si no, ítems con descuento
    //   productos = repuestos a precio de venta (los pone el negocio, no se reparten)
    //   impuestos = % de configuración, SOLO si se cobró con factura
    //   neto      = cobrado − productos − impuestos (mano de obra a repartir)
    private record Desglose(BigDecimal cobrado, BigDecimal productos, BigDecimal impuestos, BigDecimal neto) {}

    private int pctImpuestosConfig() {
        return configRepo.findById(1L)
                .map(c -> c.getPorcentajeImpuestos() != null ? c.getPorcentajeImpuestos() : 30)
                .orElse(30);
    }

    private Desglose desglose(Servicio s, BigDecimal pctImp) {
        final java.math.RoundingMode rm = java.math.RoundingMode.HALF_UP;
        BigDecimal cobrado;
        if (s.getMontoFinal() != null && s.getMontoFinal().compareTo(BigDecimal.ZERO) > 0) {
            cobrado = s.getMontoFinal().setScale(2, rm);
        } else {
            cobrado = s.getItems().stream()
                    .map(i -> i.getCosto() != null ? i.getCosto() : BigDecimal.ZERO)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            BigDecimal descPct = s.getDescuentoPorcentaje();
            if (descPct != null && descPct.compareTo(BigDecimal.ZERO) > 0) {
                BigDecimal factor = BigDecimal.ONE.subtract(descPct.divide(BigDecimal.valueOf(100), 4, rm));
                cobrado = cobrado.multiply(factor);
            }
            cobrado = cobrado.setScale(2, rm);
        }

        BigDecimal productos = BigDecimal.ZERO;
        for (ServicioItem item : s.getItems()) {
            String json = item.getRepuestosUsados();
            if (json == null || json.isBlank()) continue;
            try {
                List<java.util.Map<String, Object>> lista = objectMapper.readValue(json, new TypeReference<>() {});
                for (java.util.Map<String, Object> r : lista) {
                    Object sub = r.get("subtotal"), precio = r.get("precio"), cant = r.get("cantidad");
                    BigDecimal val = BigDecimal.ZERO;
                    if (sub != null) val = new BigDecimal(sub.toString());
                    else if (precio != null && cant != null)
                        val = new BigDecimal(precio.toString()).multiply(new BigDecimal(cant.toString()));
                    productos = productos.add(val);
                }
            } catch (Exception e) { log.warn("Error parseando JSON repuestos: {}", e.getMessage()); }
        }
        productos = productos.setScale(2, rm);

        BigDecimal impuestos = s.getModalidadCobro() == ModalidadCobro.CON_FACTURA
                ? cobrado.multiply(pctImp).divide(BigDecimal.valueOf(100), 2, rm)
                : BigDecimal.ZERO.setScale(2);
        BigDecimal neto = cobrado.subtract(productos).subtract(impuestos).max(BigDecimal.ZERO);
        return new Desglose(cobrado, productos, impuestos, neto);
    }

    // Ganancia neta (mano de obra a repartir) de un servicio
    private BigDecimal calcularGananciaNetaServicio(Servicio s, BigDecimal pctImp, java.math.RoundingMode rm) {
        return desglose(s, pctImp).neto();
    }

    // ── Liquidación mensual del técnico/socio ─────────────────────────────────
    private static final java.util.Set<EstadoServicio> ESTADOS_PENDIENTE_COBRO = java.util.EnumSet.of(
            EstadoServicio.COMPLETADO, EstadoServicio.PENDIENTE_FACTURACION, EstadoServicio.FACTURADO);

    @Transactional(readOnly = true)
    public LiquidacionDTO liquidacion(Long tecnicoId, String mesParam) {
        final java.math.RoundingMode RM = java.math.RoundingMode.HALF_UP;
        final int pctImpInt = pctImpuestosConfig();
        final BigDecimal pctImp = BigDecimal.valueOf(pctImpInt);
        final int pctTecnico = 50;
        Usuario tecnico = usuarioRepository.findById(tecnicoId)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado"));
        YearMonth mes = (mesParam != null && !mesParam.isBlank()) ? YearMonth.parse(mesParam) : YearMonth.now();
        String desde = mes.atDay(1).toString();
        String hasta = mes.atEndOfMonth().toString();

        List<Servicio> cobrados = servicioRepository.findAll(
                buildSpec(null, "COBRADO,REALIZADO", null, desde, hasta, tecnicoId, null));
        List<Servicio> pendientesSrv = servicioRepository.findAll(
                buildSpec(null, "COMPLETADO,PENDIENTE_FACTURACION,FACTURADO", null, desde, hasta, tecnicoId, null));
        Comparator<Servicio> porFecha = Comparator.comparing(Servicio::getFechaServicio,
                Comparator.nullsLast(Comparator.naturalOrder()));
        cobrados.sort(porFecha);
        pendientesSrv.sort(porFecha);

        List<LiquidacionDTO.Linea> lineas = new ArrayList<>();
        BigDecimal tCob = BigDecimal.ZERO, tProd = BigDecimal.ZERO, tImp = BigDecimal.ZERO, tNeto = BigDecimal.ZERO, tParte = BigDecimal.ZERO;
        for (Servicio s : cobrados) {
            Desglose d = desglose(s, pctImp);
            BigDecimal parte = d.neto().multiply(BigDecimal.valueOf(pctTecnico)).divide(BigDecimal.valueOf(100), 2, RM);
            lineas.add(new LiquidacionDTO.Linea(s.getId(), s.getFechaServicio(), nombreCliente(s), detalleTrabajo(s),
                    etiquetaCobro(s), d.cobrado(), d.productos(), d.impuestos(), d.neto(), parte));
            tCob = tCob.add(d.cobrado()); tProd = tProd.add(d.productos()); tImp = tImp.add(d.impuestos());
            tNeto = tNeto.add(d.neto()); tParte = tParte.add(parte);
        }
        List<LiquidacionDTO.Pendiente> pendientes = pendientesSrv.stream()
                .filter(s -> ESTADOS_PENDIENTE_COBRO.contains(s.getEstado()))
                .map(s -> new LiquidacionDTO.Pendiente(s.getId(), s.getFechaServicio(), nombreCliente(s),
                        detalleTrabajo(s), s.getEstado().name(), desglose(s, pctImp).cobrado()))
                .collect(java.util.stream.Collectors.toList());

        return new LiquidacionDTO(tecnico.getId(), tecnico.getNombre(), mes.toString(), pctImpInt, pctTecnico,
                lineas, pendientes, tCob, tProd, tImp, tNeto, tParte, tNeto.subtract(tParte));
    }

    private static String nombreCliente(Servicio s) {
        if (s.getClienteNombre() != null && !s.getClienteNombre().isBlank()) return s.getClienteNombre();
        if (s.getSede() != null && s.getSede().getCliente() != null) return s.getSede().getCliente().getNombre();
        return "Cliente";
    }

    private static String detalleTrabajo(Servicio s) {
        String det = s.getItems().stream()
                .map(ServicioItem::getTrabajoRealizado)
                .filter(t -> t != null && !t.isBlank())
                .findFirst().orElse(null);
        if (det == null) det = s.getServicioTipo() == ServicioTipo.VENTA ? "Venta" : "Servicio técnico";
        return det.length() > 80 ? det.substring(0, 77) + "..." : det;
    }

    private static String etiquetaCobro(Servicio s) {
        if (s.getModalidadCobro() == ModalidadCobro.CON_FACTURA) return "Con factura";
        if (s.getModalidadCobro() == ModalidadCobro.EFECTIVO_SIN_FACTURA) return "Efectivo";
        return "Sin factura";
    }

    private static boolean perteneceAOtroCliente(Equipo equipo, Servicio servicio) {
        if (equipo.getSede() == null || equipo.getSede().getCliente() == null) return false;
        if (servicio.getSede() == null || servicio.getSede().getCliente() == null) return false;
        return !equipo.getSede().getCliente().getId().equals(servicio.getSede().getCliente().getId());
    }

    // Saca acentos y diéresis (para buscar "guemes" y encontrar "Güemes")
    private static String sinAcentos(String t) {
        return java.text.Normalizer.normalize(t, java.text.Normalizer.Form.NFD).replaceAll("\\p{M}", "");
    }
}
