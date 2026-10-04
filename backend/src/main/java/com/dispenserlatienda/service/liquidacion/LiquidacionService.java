package com.dispenserlatienda.service.liquidacion;

import com.dispenserlatienda.domain.liquidacion.CierreLiquidacion;
import com.dispenserlatienda.domain.liquidacion.MovimientoSocio;
import com.dispenserlatienda.domain.rendicion.Rendicion;
import com.dispenserlatienda.domain.usuario.Usuario;
import com.dispenserlatienda.dto.servicio.LiquidacionCompletaDTO;
import com.dispenserlatienda.dto.servicio.LiquidacionCompletaDTO.*;
import com.dispenserlatienda.dto.servicio.LiquidacionDTO;
import com.dispenserlatienda.exception.ResourceNotFoundException;
import com.dispenserlatienda.repository.liquidacion.CierreLiquidacionRepository;
import com.dispenserlatienda.repository.liquidacion.MovimientoSocioRepository;
import com.dispenserlatienda.repository.rendicion.RendicionRepository;
import com.dispenserlatienda.repository.usuario.UsuarioRepository;
import com.dispenserlatienda.service.servicio.ServicioService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.List;

// Cuentas y cierre de la liquidación mensual del técnico/socio (5-oct-2026).
@Service
public class LiquidacionService {
    private final ServicioService servicioService;
    private final MovimientoSocioRepository movRepo;
    private final CierreLiquidacionRepository cierreRepo;
    private final RendicionRepository rendicionRepo;
    private final UsuarioRepository usuarioRepo;
    private final ObjectMapper objectMapper;

    public LiquidacionService(ServicioService servicioService, MovimientoSocioRepository movRepo,
                              CierreLiquidacionRepository cierreRepo, RendicionRepository rendicionRepo,
                              UsuarioRepository usuarioRepo, ObjectMapper objectMapper) {
        this.servicioService = servicioService;
        this.movRepo = movRepo;
        this.cierreRepo = cierreRepo;
        this.rendicionRepo = rendicionRepo;
        this.usuarioRepo = usuarioRepo;
        this.objectMapper = objectMapper;
    }

    private static String mesDe(String mes) {
        return (mes == null || mes.isBlank()) ? YearMonth.now().toString() : YearMonth.parse(mes).toString();
    }

    @Transactional(readOnly = true)
    public LiquidacionCompletaDTO obtener(Long tecnicoId, String mesParam) {
        String mes = mesDe(mesParam);
        CierreLiquidacion c = cierreRepo.findByTecnicoIdAndMes(tecnicoId, mes).orElse(null);
        if (c != null) {
            try {
                Snapshot s = objectMapper.readValue(c.getSnapshotJson(), Snapshot.class);
                return new LiquidacionCompletaDTO(s.base(), s.cuentas(), s.movimientos(),
                        new Cierre(true, c.getCerradoEn(), c.getAceptadoEn()));
            } catch (Exception e) {
                throw new IllegalStateException("No se pudo leer el cierre guardado");
            }
        }
        Snapshot s = calcular(tecnicoId, mes);
        return new LiquidacionCompletaDTO(s.base(), s.cuentas(), s.movimientos(), new Cierre(false, null, null));
    }

    private Snapshot calcular(Long tecnicoId, String mes) {
        LiquidacionDTO base = servicioService.liquidacion(tecnicoId, mes);
        YearMonth ym = YearMonth.parse(mes);

        BigDecimal efectivo = base.trabajos().stream()
                .filter(t -> "Efectivo".equals(t.cobro()))
                .map(LiquidacionDTO.Linea::cobrado).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal rendido = rendicionRepo.findByTecnicoIdAndFechaBetween(tecnicoId, ym.atDay(1), ym.atEndOfMonth())
                .stream().filter(Rendicion::isRecibido)
                .map(Rendicion::getMonto).reduce(BigDecimal.ZERO, BigDecimal::add);

        List<MovimientoSocio> movs = movRepo.findByTecnicoIdAndMesOrderByFechaAscIdAsc(tecnicoId, mes);
        BigDecimal entregado = movs.stream().filter(m -> "ENTREGA".equals(m.getTipo()))
                .map(MovimientoSocio::getMonto).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal pagado = movs.stream().filter(m -> "PAGO".equals(m.getTipo()))
                .map(MovimientoSocio::getMonto).reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal enMano = efectivo.subtract(rendido).subtract(entregado);
        BigDecimal saldo = base.parteTecnico().subtract(enMano).subtract(pagado);
        Cuentas cuentas = new Cuentas(base.parteTecnico(), efectivo, rendido, entregado, enMano, pagado, saldo);
        List<Movimiento> lista = movs.stream()
                .map(m -> new Movimiento(m.getId(), m.getFecha(), m.getTipo(), m.getMonto(), m.getNota())).toList();
        return new Snapshot(base, cuentas, lista);
    }

    private void exigirAbierto(Long tecnicoId, String mes) {
        if (cierreRepo.findByTecnicoIdAndMes(tecnicoId, mes).isPresent())
            throw new IllegalArgumentException("El mes está cerrado. Reabrilo para cambiarlo.");
    }

    @Transactional
    public LiquidacionCompletaDTO agregarMovimiento(Long tecnicoId, String mesParam, String tipo, BigDecimal monto, String nota) {
        String mes = mesDe(mesParam);
        exigirAbierto(tecnicoId, mes);
        if (!"PAGO".equals(tipo) && !"ENTREGA".equals(tipo)) throw new IllegalArgumentException("Tipo inválido");
        if (monto == null || monto.signum() <= 0) throw new IllegalArgumentException("Monto inválido");
        Usuario t = usuarioRepo.findById(tecnicoId).orElseThrow(() -> new ResourceNotFoundException("Técnico no encontrado"));
        MovimientoSocio m = new MovimientoSocio();
        m.setTecnico(t);
        m.setMes(mes);
        m.setTipo(tipo);
        m.setMonto(monto);
        if (nota != null && !nota.isBlank()) m.setNota(nota.trim().length() > 200 ? nota.trim().substring(0, 200) : nota.trim());
        movRepo.save(m);
        return obtener(tecnicoId, mes);
    }

    @Transactional
    public LiquidacionCompletaDTO borrarMovimiento(Long id) {
        MovimientoSocio m = movRepo.findById(id).orElseThrow(() -> new ResourceNotFoundException("Movimiento no encontrado"));
        Long tec = m.getTecnico().getId();
        String mes = m.getMes();
        exigirAbierto(tec, mes);
        movRepo.delete(m);
        return obtener(tec, mes);
    }

    @Transactional
    public LiquidacionCompletaDTO cerrar(Long tecnicoId, String mesParam) {
        String mes = mesDe(mesParam);
        exigirAbierto(tecnicoId, mes);
        Usuario t = usuarioRepo.findById(tecnicoId).orElseThrow(() -> new ResourceNotFoundException("Técnico no encontrado"));
        CierreLiquidacion c = new CierreLiquidacion();
        c.setTecnico(t);
        c.setMes(mes);
        try {
            c.setSnapshotJson(objectMapper.writeValueAsString(calcular(tecnicoId, mes)));
        } catch (Exception e) {
            throw new IllegalStateException("No se pudo guardar el cierre");
        }
        cierreRepo.save(c);
        return obtener(tecnicoId, mes);
    }

    @Transactional
    public LiquidacionCompletaDTO reabrir(Long tecnicoId, String mesParam) {
        String mes = mesDe(mesParam);
        cierreRepo.findByTecnicoIdAndMes(tecnicoId, mes).ifPresent(cierreRepo::delete);
        cierreRepo.flush();
        return obtener(tecnicoId, mes);
    }

    @Transactional
    public LiquidacionCompletaDTO aceptar(Long tecnicoId, String mesParam) {
        String mes = mesDe(mesParam);
        CierreLiquidacion c = cierreRepo.findByTecnicoIdAndMes(tecnicoId, mes)
                .orElseThrow(() -> new IllegalArgumentException("El admin todavía no cerró este mes"));
        if (c.getAceptadoEn() == null) c.setAceptadoEn(LocalDateTime.now());
        return obtener(tecnicoId, mes);
    }

}
