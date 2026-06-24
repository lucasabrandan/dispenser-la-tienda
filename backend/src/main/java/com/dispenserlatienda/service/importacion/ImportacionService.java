package com.dispenserlatienda.service.importacion;

import com.dispenserlatienda.domain.cliente.Cliente;
import com.dispenserlatienda.domain.cliente.ClienteTipo;
import com.dispenserlatienda.domain.cliente.CondicionIva;
import com.dispenserlatienda.domain.equipo.Equipo;
import com.dispenserlatienda.domain.sede.Sede;
import com.dispenserlatienda.domain.servicio.*;
import com.dispenserlatienda.domain.usuario.Usuario;
import com.dispenserlatienda.dto.importacion.ImportResultDTO;
import com.dispenserlatienda.repository.cliente.ClienteRepository;
import com.dispenserlatienda.repository.equipo.EquipoRepository;
import com.dispenserlatienda.repository.sede.SedeRepository;
import com.dispenserlatienda.repository.servicio.ServicioRepository;
import com.dispenserlatienda.repository.usuario.UsuarioRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class ImportacionService {

    private final ClienteRepository  clienteRepo;
    private final SedeRepository     sedeRepo;
    private final EquipoRepository   equipoRepo;
    private final UsuarioRepository  usuarioRepo;
    private final ServicioRepository servicioRepo;

    public ImportacionService(ClienteRepository clienteRepo, SedeRepository sedeRepo,
                               EquipoRepository equipoRepo, UsuarioRepository usuarioRepo,
                               ServicioRepository servicioRepo) {
        this.clienteRepo  = clienteRepo;
        this.sedeRepo     = sedeRepo;
        this.equipoRepo   = equipoRepo;
        this.usuarioRepo  = usuarioRepo;
        this.servicioRepo = servicioRepo;
    }

    /**
     * Importa servicios históricos desde un CSV.
     * Columnas: fecha,cliente,equipo_modelo,equipo_serial,descripcion,monto,tecnico
     * Cada fila se procesa de forma independiente — una fila con error no cancela las demás.
     */
    public ImportResultDTO importarServiciosCSV(MultipartFile file, Long tecnicoDefaultId) throws Exception {
        List<String> errores = new ArrayList<>();
        int importados = 0;

        Usuario tecnicoDefault = usuarioRepo.findById(tecnicoDefaultId)
            .orElseThrow(() -> new IllegalArgumentException("Técnico por defecto no encontrado"));

        BufferedReader reader = new BufferedReader(
            new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8)
        );

        String header = reader.readLine(); // saltar encabezado
        if (header == null) return new ImportResultDTO(0, 0, List.of());

        String line;
        int nroFila = 1;
        while ((line = reader.readLine()) != null) {
            nroFila++;
            line = line.trim();
            if (line.isEmpty()) continue;

            try {
                procesarFila(line, tecnicoDefault);
                importados++;
            } catch (Exception e) {
                errores.add("Fila " + nroFila + ": " + e.getMessage());
            }
        }

        return new ImportResultDTO(importados, errores.size(), errores);
    }

    @Transactional
    protected void procesarFila(String line, Usuario tecnicoDefault) {
        String[] cols = parsearCSV(line);

        String fecha         = cols.length > 0 ? cols[0].trim() : "";
        String clienteNombre = cols.length > 1 ? cols[1].trim() : "";
        String equipoModelo  = cols.length > 2 ? cols[2].trim() : "Dispenser";
        String equipoSerial  = cols.length > 3 ? cols[3].trim() : "";
        String descripcion   = cols.length > 4 ? cols[4].trim() : "";
        String montoStr      = cols.length > 5 ? cols[5].trim() : "0";
        String tecnicoNombre = cols.length > 6 ? cols[6].trim() : "";

        if (clienteNombre.isEmpty()) throw new IllegalArgumentException("Cliente vacío");
        if (fecha.isEmpty())         throw new IllegalArgumentException("Fecha vacía");

        LocalDate fechaServicio = parsearFecha(fecha);
        BigDecimal monto = parsearMonto(montoStr);

        // Técnico: buscar por nombre, fallback al default
        Usuario tecnico = tecnicoNombre.isEmpty() ? tecnicoDefault
            : usuarioRepo.findFirstByNombreContainingIgnoreCase(tecnicoNombre)
                         .orElse(tecnicoDefault);

        // Cliente: buscar o crear
        Cliente cliente = clienteRepo.findByNombreIgnoreCase(clienteNombre)
            .orElseGet(() -> clienteRepo.save(
                new Cliente(ClienteTipo.PARTICULAR, clienteNombre, null, null, null, "Importado CSV", CondicionIva.CONSUMIDOR_FINAL)
            ));

        // Sede: primera activa del cliente, o crear "Principal"
        Sede sede = sedeRepo.findByClienteIdAndActivaTrue(cliente.getId())
            .stream().findFirst()
            .orElseGet(() -> sedeRepo.save(
                new Sede(cliente, "Principal", null, null, null, null, null, null, null, "Creada por importación")
            ));

        // Equipo: buscar por serial o crear
        Equipo equipo;
        if (!equipoSerial.isEmpty()) {
            equipo = equipoRepo.findFirstByNumeroSerie(equipoSerial)
                .orElseGet(() -> equipoRepo.save(
                    new Equipo(sede, null, equipoModelo.isEmpty() ? "Dispenser" : equipoModelo,
                               equipoSerial, null, null, null, null)
                ));
        } else {
            // Sin serial → generar uno único
            String serial = "HIST-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
            equipo = equipoRepo.save(
                new Equipo(sede, null, equipoModelo.isEmpty() ? "Dispenser" : equipoModelo,
                           serial, null, null, null, null)
            );
        }

        // Servicio
        Servicio servicio = new Servicio(sede, tecnico, fechaServicio, ServicioTipo.TECNICA);
        servicio.setEstado(EstadoServicio.REALIZADO);
        servicio.setClienteNombre(clienteNombre);
        servicio.setSedeNombre(sede.getNombreSede());
        servicio.setObservaciones("Importado desde CSV histórico");

        // Item
        ServicioItem item = new ServicioItem(
            equipo,
            tecnico.getNombre(),
            monto,
            BigDecimal.ZERO,
            BigDecimal.ZERO,
            MetodoPago.EFECTIVO,
            descripcion.isEmpty() ? "Servicio técnico" : descripcion,
            null
        );
        servicio.addItem(item);

        servicioRepo.save(servicio);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private String[] parsearCSV(String line) {
        // Soporte básico: split por coma, respeta comillas dobles
        List<String> result = new ArrayList<>();
        boolean inQuotes = false;
        StringBuilder current = new StringBuilder();
        for (char c : line.toCharArray()) {
            if (c == '"') {
                inQuotes = !inQuotes;
            } else if (c == ',' && !inQuotes) {
                result.add(current.toString());
                current = new StringBuilder();
            } else {
                current.append(c);
            }
        }
        result.add(current.toString());
        return result.toArray(new String[0]);
    }

    private LocalDate parsearFecha(String s) {
        s = s.trim();
        // DD/MM/YYYY
        if (s.matches("\\d{2}/\\d{2}/\\d{4}")) {
            return LocalDate.parse(s, DateTimeFormatter.ofPattern("dd/MM/yyyy"));
        }
        // YYYY-MM-DD
        if (s.matches("\\d{4}-\\d{2}-\\d{2}")) {
            return LocalDate.parse(s);
        }
        throw new IllegalArgumentException("Formato de fecha inválido: " + s + " (usar DD/MM/AAAA)");
    }

    private BigDecimal parsearMonto(String s) {
        if (s == null || s.isEmpty()) return BigDecimal.ZERO;
        // Eliminar $, puntos de miles, espacios
        s = s.replaceAll("[$\\s]", "").replace(".", "").replace(",", ".");
        try {
            return new BigDecimal(s);
        } catch (NumberFormatException e) {
            return BigDecimal.ZERO;
        }
    }
}
