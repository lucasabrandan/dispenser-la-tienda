package com.dispenserlatienda.service.servicio;
import com.dispenserlatienda.dto.servicio.EstadisticasMensualDTO;
import java.time.LocalDate;
import com.dispenserlatienda.domain.*;
import com.dispenserlatienda.domain.servicio.*;
import com.dispenserlatienda.domain.usuario.Usuario;
import com.dispenserlatienda.dto.servicio.*;
import com.dispenserlatienda.repository.*;
import com.dispenserlatienda.exception.ResourceNotFoundException;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.time.LocalDate;
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

    // CAMBIO: Ahora devuelve Page<ServicioDTO> en lugar de List<ServicioDTO>
    // Ejemplo: GET /api/servicios?page=0&size=20&sort=fechaServicio,desc
    @Transactional(readOnly = true)
    public Page<ServicioDTO> listarTodos(Pageable pageable) {
        return servicioRepository.findAll(pageable)
                .map(this::mapToDTO);
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

        servicio.setSede(sede);
        servicio.setUsuario(usuario);
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
                    i.getEquipo() != null ? i.getEquipo().getUbicacion() : "MOSTRADOR",
                    i.getTecnico(), i.getCosto(), i.getCostoExtra(), i.getCostoInterno(),
                    i.getDescuento(),
                    i.getMetodoPago() != null ? i.getMetodoPago().name() : "EFECTIVO",
                    i.getTrabajoRealizado(),
                    garantiaStr,
                    listaRepuestos, i.getFotoAntes(), i.getFotoDespues()
            );
        }).toList();

        return new ServicioDTO(
                s.getId(),
                s.getFechaServicio() != null ? s.getFechaServicio().toString() : null,
                s.getServicioTipo() != null ? s.getServicioTipo().name() : "VENTA",
                s.getClienteNombre(),
                s.getSedeNombre(),
                items,
                s.getEstado() != null ? s.getEstado().name() : "PRESUPUESTO",
                s.getFotoRemito()
        );
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