package com.dispenserlatienda.config;

import com.dispenserlatienda.domain.Cliente;
import com.dispenserlatienda.domain.ClienteTipo;
import com.dispenserlatienda.domain.Equipo;
import com.dispenserlatienda.domain.Sede;
import com.dispenserlatienda.domain.servicio.ServicioTipo;
import com.dispenserlatienda.domain.servicio.TrabajoTipo;
import com.dispenserlatienda.domain.usuario.RolUsuario;
import com.dispenserlatienda.domain.usuario.Usuario;
import com.dispenserlatienda.dto.servicio.ServicioCreateDTO;
import com.dispenserlatienda.dto.servicio.ServicioDTO;
import com.dispenserlatienda.dto.servicio.ServicioItemCreateDTO;
import com.dispenserlatienda.repository.ClienteRepository;
import com.dispenserlatienda.repository.EquipoRepository;
import com.dispenserlatienda.repository.SedeRepository;
import com.dispenserlatienda.repository.ServicioRepository;
import com.dispenserlatienda.repository.UsuarioRepository;
import com.dispenserlatienda.service.servicio.ServicioService;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.List;

@Profile("local")
@Component
public class DevSeedRunner implements CommandLineRunner {

    private final ClienteRepository clienteRepository;
    private final SedeRepository sedeRepository;
    private final EquipoRepository equipoRepository;
    private final UsuarioRepository usuarioRepository;
    private final ServicioRepository servicioRepository;
    private final ServicioService servicioService;

    public DevSeedRunner(ClienteRepository clienteRepository,
                         SedeRepository sedeRepository,
                         EquipoRepository equipoRepository,
                         UsuarioRepository usuarioRepository,
                         ServicioRepository servicioRepository,
                         ServicioService servicioService) {
        this.clienteRepository = clienteRepository;
        this.sedeRepository = sedeRepository;
        this.equipoRepository = equipoRepository;
        this.usuarioRepository = usuarioRepository;
        this.servicioRepository = servicioRepository;
        this.servicioService = servicioService;
    }

    @Override
    public void run(String... args) {

        // 1) Cliente
        Cliente cliente = clienteRepository.findByCuilDni("20123456789")
                .orElseGet(() -> clienteRepository.save(
                        new Cliente(ClienteTipo.EMPRESA, "Cliente Demo", "20123456789", "1122334455", "demo@demo.com", null)
                ));

        // 2) Sede
        Sede sede = sedeRepository.findByClienteIdAndNombreSede(cliente.getId(), "Casa Central")
                .orElseGet(() -> sedeRepository.save(
                        new Sede(cliente, "Casa Central", "Av. Siempre Viva 123", "Lanús", null)
                ));

        // 3) Equipo
        Equipo equipo = equipoRepository.findByNumeroSerie("495050")
                .orElseGet(() -> equipoRepository.save(
                        new Equipo(sede, "MarcaX", "ModeloY", "495050", "Recepción", null)
                ));

        // 4) Usuario
        Usuario tecnico = usuarioRepository.findByUsername("marcos")
                .orElseGet(() -> usuarioRepository.save(
                        new Usuario("Marcos", "marcos", "hash-demo", RolUsuario.TECNICO)
                ));

        // 5) Servicio demo (usando el nuevo DTO)
        LocalDate hoy = LocalDate.now();
        boolean yaExisteServicioDemo = servicioRepository.existsBySedeIdAndUsuarioIdAndFechaServicioAndServicioTipo(
                sede.getId(),
                tecnico.getId(),
                hoy,
                ServicioTipo.REPARACION
        );

        if (yaExisteServicioDemo) {
            System.out.println("ℹ️ Seed: Servicio demo ya existe para hoy.");
        } else {
            // Preparamos el item
            ServicioItemCreateDTO itemDto = new ServicioItemCreateDTO(
                    equipo.getId(),
                    TrabajoTipo.REPARACION,
                    "Se cambió válvula y se probó funcionamiento"
            );

            // Preparamos el Servicio completo
            ServicioCreateDTO servicioDto = new ServicioCreateDTO(
                    sede.getId(),
                    tecnico.getId(),
                    hoy,
                    ServicioTipo.REPARACION,
                    "Carga inicial de semilla",
                    List.of(itemDto)
            );

            ServicioDTO resultado = servicioService.crearServicioCompleto(servicioDto);
            System.out.println("✅ Seed: Servicio creado con ID: " + resultado.id());
        }

        // --- 🛡️ PRUEBA DE BLINDAJE ---
        try {
            System.out.println("🧪 Probando blindaje de integridad (Sede vs Equipo)...");

            Sede sedeDeposito = sedeRepository.findByClienteIdAndNombreSede(cliente.getId(), "Depósito")
                    .orElseGet(() -> sedeRepository.save(
                            new Sede(cliente, "Depósito", "Calle Falsa 456", "Quilmes", "Sede para pruebas")
                    ));

            ServicioCreateDTO dtoInconsistente = new ServicioCreateDTO(
                    sedeDeposito.getId(), // Sede Depósito
                    tecnico.getId(),
                    hoy,
                    ServicioTipo.REPARACION,
                    "Prueba fallo",
                    List.of(new ServicioItemCreateDTO(equipo.getId(), TrabajoTipo.REPARACION, "Fallo esperado")) // Equipo pertenece a Casa Central
            );

            servicioService.crearServicioCompleto(dtoInconsistente);
            System.err.println("❌ ERROR: El blindaje falló.");
        } catch (IllegalArgumentException e) {
            System.out.println("🛡️ ÉXITO: El blindaje funcionó. Error: " + e.getMessage());
        }
    }
}