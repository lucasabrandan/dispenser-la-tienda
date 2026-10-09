package com.dispenserlatienda.service.empresa;

import com.dispenserlatienda.domain.cliente.Cliente;
import com.dispenserlatienda.exception.ResourceNotFoundException;
import com.dispenserlatienda.repository.cliente.ClienteRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.YearMonth;
import java.util.LinkedHashMap;
import java.util.Map;

// Funciones del portal que ve cada cliente empresa (9-oct-2026). El admin las prende
// o apaga desde la ficha del cliente. Lo sensible (puntaje y números) viene APAGADO:
// está preparado, pero solo se muestra si el admin lo decide para ese cliente.
@Service
public class PortalConfigService {

    // diasAprobacionAuto: días después de cerrado el mes para aprobarlo solo (0 = nunca).
    // aprobacionAutoDesde: primer mes al que se aplica (nunca aprueba meses viejos de golpe).
    public record Config(boolean calificacion, boolean numeros, boolean mapa, boolean comentarios,
                         boolean reporteSemanal, int diasAprobacionAuto, String aprobacionAutoDesde) {}

    // Mes en que se publicó la función: los meses anteriores nunca se aprueban solos
    static final String DESDE_INICIAL = "2026-10";
    public static final Config POR_DEFECTO = new Config(false, false, true, true, true, 5, DESDE_INICIAL);

    private final ClienteRepository clienteRepo;
    private final ObjectMapper json;

    public PortalConfigService(ClienteRepository clienteRepo, ObjectMapper json) {
        this.clienteRepo = clienteRepo;
        this.json = json;
    }

    @Transactional(readOnly = true)
    public Config de(Long clienteId) {
        if (clienteId == null) return POR_DEFECTO;
        return clienteRepo.findById(clienteId).map(c -> leer(c.getPortalConfig())).orElse(POR_DEFECTO);
    }

    @Transactional
    public Config guardar(Long clienteId, Map<String, Object> cambios) {
        Cliente c = clienteRepo.findById(clienteId).orElseThrow(() -> new ResourceNotFoundException("Cliente no encontrado"));
        Config a = leer(c.getPortalConfig());
        int dias = cambios.get("diasAprobacionAuto") instanceof Number n ? Math.max(0, Math.min(30, n.intValue())) : a.diasAprobacionAuto();
        // Si la aprobación automática estaba apagada y se prende, arranca desde el mes actual
        String desde = (a.diasAprobacionAuto() == 0 && dias > 0) ? YearMonth.now().toString() : a.aprobacionAutoDesde();
        Config n = new Config(
            bool(cambios, "calificacion", a.calificacion()),
            bool(cambios, "numeros", a.numeros()),
            bool(cambios, "mapa", a.mapa()),
            bool(cambios, "comentarios", a.comentarios()),
            bool(cambios, "reporteSemanal", a.reporteSemanal()),
            dias, desde);
        try { c.setPortalConfig(json.writeValueAsString(n)); }
        catch (Exception e) { throw new IllegalStateException("No se pudo guardar la configuración del portal"); }
        clienteRepo.save(c);
        return n;
    }

    // Lo que ve el front del portal (sin datos internos)
    public static Map<String, Object> aMapa(Config c) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("calificacion", c.calificacion());
        m.put("numeros", c.numeros());
        m.put("mapa", c.mapa());
        m.put("comentarios", c.comentarios());
        m.put("reporteSemanal", c.reporteSemanal());
        m.put("diasAprobacionAuto", c.diasAprobacionAuto());
        return m;
    }

    private Config leer(String texto) {
        if (texto == null || texto.isBlank()) return POR_DEFECTO;
        try {
            Map<String, Object> m = json.readValue(texto, new TypeReference<>() {});
            Config d = POR_DEFECTO;
            return new Config(bool(m, "calificacion", d.calificacion()), bool(m, "numeros", d.numeros()),
                bool(m, "mapa", d.mapa()), bool(m, "comentarios", d.comentarios()),
                bool(m, "reporteSemanal", d.reporteSemanal()),
                m.get("diasAprobacionAuto") instanceof Number n ? n.intValue() : d.diasAprobacionAuto(),
                m.get("aprobacionAutoDesde") instanceof String s && !s.isBlank() ? s : d.aprobacionAutoDesde());
        } catch (Exception e) { return POR_DEFECTO; }
    }

    private static boolean bool(Map<String, Object> m, String k, boolean def) {
        Object v = m.get(k);
        return v instanceof Boolean b ? b : def;
    }
}
