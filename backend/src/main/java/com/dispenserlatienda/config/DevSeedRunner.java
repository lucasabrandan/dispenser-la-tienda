package com.dispenserlatienda.config;

import com.dispenserlatienda.domain.*;
import com.dispenserlatienda.domain.servicio.ServicioTipo;
import com.dispenserlatienda.domain.servicio.TrabajoTipo;
import com.dispenserlatienda.domain.usuario.RolUsuario;
import com.dispenserlatienda.domain.usuario.Usuario;
import com.dispenserlatienda.dto.servicio.ServicioCreateDTO;
import com.dispenserlatienda.dto.servicio.ServicioItemCreateDTO;
import com.dispenserlatienda.repository.*;
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
        try {
            System.out.println("🌱 Cargando datos de prueba...");

            Cliente cliente = clienteRepository.findByCuilDni("20123456789")
                    .orElseGet(() -> clienteRepository.save(new Cliente(ClienteTipo.EMPRESA, "Cliente Demo", "20123456789", "1122334455", "demo@demo.com", null)));

            Sede sede = sedeRepository.findByClienteIdAndNombreSede(cliente.getId(), "Casa Central")
                    .orElseGet(() -> sedeRepository.save(new Sede(cliente, "Casa Central", "Av. Siempre Viva 123", "Lanús", null)));

            Equipo equipo = equipoRepository.findByNumeroSerie("495050")
                    .orElseGet(() -> equipoRepository.save(new Equipo(sede, "MarcaX", "ModeloY", "495050", "Recepción", null)));

            Usuario tecnico = usuarioRepository.findByUsername("marcos")
                    .orElseGet(() -> usuarioRepository.save(new Usuario("Marcos", "marcos", "hash-demo", RolUsuario.TECNICO)));

            LocalDate hoy = LocalDate.now();

            // 🛡️ VERIFICACIÓN DE SERVICIO DEMO
            if (!servicioRepository.existsBySedeIdAndUsuarioIdAndFechaServicioAndServicioTipo(sede.getId(), tecnico.getId(), hoy, ServicioTipo.REPARACION)) {
                // Importante: Mandamos "0" como String para el descuento
                ServicioItemCreateDTO item = new ServicioItemCreateDTO("495050", TrabajoTipo.REPARACION, "Carga inicial");
                ServicioCreateDTO dto = new ServicioCreateDTO(sede.getId(), tecnico.getId(), hoy, ServicioTipo.REPARACION, "Seed", List.of(item));
                servicioService.crearServicioCompleto(dto);
                System.out.println("✅ Servicio demo creado con éxito.");
            }

            // LANZAMOS LA PRUEBA
            ejecutarPruebaBlindaje(cliente, tecnico, hoy);

            System.out.println("🚀 TODO LISTO: Podés entrar al sistema.");

        } catch (Exception e) {
            System.err.println("⚠️ ERROR CRÍTICO EN RUNNER: " + e.getMessage());
            e.printStackTrace(); // Esto te va a decir exacto qué falló en la consola
        }
    }

    private void ejecutarPruebaBlindaje(Cliente cliente, Usuario tecnico, LocalDate hoy) {
        try {
            System.out.println("🧪 Probando blindaje de integridad...");
            Sede sedeDeposito = sedeRepository.findByClienteIdAndNombreSede(cliente.getId(), "Depósito")
                    .orElseGet(() -> sedeRepository.save(new Sede(cliente, "Depósito", "Calle Falsa 123", "Quilmes", null)));

            // Prueba: Intentar asignar dispenser de Sede A a Sede B
            ServicioCreateDTO dtoError = new ServicioCreateDTO(
                    sedeDeposito.getId(), tecnico.getId(), hoy, ServicioTipo.REPARACION, "Error",
                    List.of(new ServicioItemCreateDTO("495050", TrabajoTipo.REPARACION, "No debe guardar"))
            );

            servicioService.crearServicioCompleto(dtoError);
            System.out.println("❌ ERROR: El blindaje NO funcionó, se guardó algo inválido.");

        } catch (Exception e) {
            // 🎯 CAPTURAMOS CUALQUIER ERROR (No solo IllegalArgument)
            System.out.println("🛡️ ÉXITO: El blindaje bloqueó la operación correctamente.");
            System.out.println("👉 Motivo del bloqueo: " + e.getMessage());
        }
    }
}