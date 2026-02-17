package com.dispenserlatienda.config;

import com.dispenserlatienda.domain.Cliente;
import com.dispenserlatienda.domain.ClienteTipo;
import com.dispenserlatienda.domain.Equipo;
import com.dispenserlatienda.domain.Sede;
import com.dispenserlatienda.domain.servicio.ServicioItem;
import com.dispenserlatienda.domain.servicio.ServicioTipo;
import com.dispenserlatienda.domain.servicio.TrabajoTipo;
import com.dispenserlatienda.domain.usuario.RolUsuario;
import com.dispenserlatienda.domain.usuario.Usuario;
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
                        new Cliente(
                                ClienteTipo.EMPRESA,
                                "Cliente Demo",
                                "20123456789",
                                "1122334455",
                                "demo@demo.com",
                                null
                        )
                ));

        // 2) Sede
        Sede sede = sedeRepository.findByClienteIdAndNombreSede(cliente.getId(), "Casa Central")
                .orElseGet(() -> sedeRepository.save(
                        new Sede(
                                cliente,
                                "Casa Central",
                                "Av. Siempre Viva 123",
                                "Lanús",
                                null
                        )
                ));

        // 3) Equipo
        Equipo equipo = equipoRepository.findByNumeroSerie("495050")
                .orElseGet(() -> equipoRepository.save(
                        new Equipo(
                                sede,
                                "MarcaX",
                                "ModeloY",
                                "495050",
                                "Recepción",
                                null
                        )
                ));

        // 4) Usuario
        Usuario tecnico = usuarioRepository.findByUsername("marcos")
                .orElseGet(() -> usuarioRepository.save(
                        new Usuario("Marcos", "marcos", "hash-demo", RolUsuario.TECNICO)
                ));

        // 5) Servicio demo (idempotente por día)
        LocalDate hoy = LocalDate.now();
        boolean yaExisteServicioDemo = servicioRepository.existsBySedeIdAndUsuarioIdAndFechaServicioAndTipo(
                sede.getId(),
                tecnico.getId(),
                hoy,
                ServicioTipo.REPARACION
        );

        if (yaExisteServicioDemo) {
            System.out.println("ℹ️ Seed: Servicio demo ya existe para hoy. No se crea otro.");
        } else {
            ServicioItem item = servicioService.crearServicioConUnItem(
                    sede.getId(),
                    tecnico.getId(),
                    equipo.getId(),
                    hoy,
                    ServicioTipo.REPARACION,
                    TrabajoTipo.REPARACION,
                    "Se cambió válvula y se probó funcionamiento"
            );
            System.out.println("✅ Seed: ServicioItem creado. Garantía hasta: " + item.getGarantiaHasta());
        }

        // --- 🛡️ PRUEBA DE BLINDAJE PROFESIONAL ---
        // Intentamos forzar una inconsistencia: Sede B con Equipo de Sede A.
        try {
            System.out.println("🧪 Probando blindaje de integridad (Sede vs Equipo)...");

            Sede sedeDeposito = sedeRepository.findByClienteIdAndNombreSede(cliente.getId(), "Depósito")
                    .orElseGet(() -> sedeRepository.save(
                            new Sede(cliente, "Depósito", "Calle Falsa 456", "Quilmes", "Sede para pruebas")
                    ));

            // Esto DEBE fallar porque 'equipo' pertenece a 'Casa Central', no a 'Depósito'
            servicioService.crearServicioConUnItem(
                    sedeDeposito.getId(),
                    tecnico.getId(),
                    equipo.getId(),
                    hoy,
                    ServicioTipo.REPARACION,
                    TrabajoTipo.REPARACION,
                    "Esta prueba no debería persistirse"
            );

            System.err.println("❌ ERROR: El blindaje falló. El servicio se creó a pesar de la inconsistencia.");
        } catch (IllegalArgumentException e) {
            System.out.println("🛡️ ÉXITO: El blindaje funcionó correctamente. Error capturado: " + e.getMessage());
        }
        // ------------------------------------------
    }
}