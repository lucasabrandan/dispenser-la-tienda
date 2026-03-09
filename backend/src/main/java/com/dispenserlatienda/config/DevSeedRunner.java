package com.dispenserlatienda.config;

import com.dispenserlatienda.domain.*;
import com.dispenserlatienda.domain.usuario.RolUsuario;
import com.dispenserlatienda.domain.usuario.Usuario;
import com.dispenserlatienda.repository.*;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;

@Profile("local")
@Component
public class DevSeedRunner implements CommandLineRunner {

    private final ClienteRepository clienteRepository;
    private final SedeRepository sedeRepository;
    private final EquipoRepository equipoRepository;
    private final UsuarioRepository usuarioRepository;
    private final RepuestoRepository repuestoRepository;

    public DevSeedRunner(ClienteRepository clienteRepository, SedeRepository sedeRepository,
                         EquipoRepository equipoRepository, UsuarioRepository usuarioRepository,
                         RepuestoRepository repuestoRepository) {
        this.clienteRepository = clienteRepository;
        this.sedeRepository = sedeRepository;
        this.equipoRepository = equipoRepository;
        this.usuarioRepository = usuarioRepository;
        this.repuestoRepository = repuestoRepository;
    }

    @Override
    public void run(String... args) {
        try {
            System.out.println("----------------------------------------------");
            System.out.println("🚀 DISPENSER LA TIENDA: Iniciando Carga de Sistema");

            // 1. CLIENTE: Sanatorio Guemes
            Cliente cliente = clienteRepository.findByCuilDni("20123456789")
                    .orElseGet(() -> clienteRepository.saveAndFlush(new Cliente(
                            ClienteTipo.EMPRESA,
                            "Sanatorio Guemes",
                            "20123456789",
                            "1122334455",
                            "contacto@guemes.com",
                            "Cliente Seed",
                            "RESPONSABLE_INSCRIPTO"
                    )));

            // 2. SEDE: Casa Central (Actualizado a 10 parámetros)
            Sede casaCentral = sedeRepository.findByClienteIdAndNombreSede(cliente.getId(), "Casa Central")
                    .orElseGet(() -> sedeRepository.saveAndFlush(new Sede(
                            cliente,                // 1. Cliente
                            "Casa Central",         // 2. Nombre Sede
                            "Av. Córdoba",          // 3. Calle
                            "3400",                 // 4. Numero
                            "1",                    // 5. Piso
                            "A",                    // 6. Depto
                            "CABA",                 // 7. Localidad
                            "CABA",                 // 8. Provincia
                            "Av. Córdoba 3400, CABA", // 9. Direccion completa
                            "Sede central administrativa" // 10. Notas
                    )));

            // 3. DISPENSERS (6 parámetros: Sede, Marca, Modelo, S/N, Ubicación, Notas)
            if (!equipoRepository.existsByNumeroSerie("495050")) {
                equipoRepository.saveAndFlush(new Equipo(
                        casaCentral,
                        "Bacope",
                        "RED",
                        "495050",
                        "Cocina Planta Baja",
                        "Filtro recién instalado"
                ));
            }

            if (!equipoRepository.existsByNumeroSerie("123")) {
                equipoRepository.saveAndFlush(new Equipo(
                        casaCentral,
                        "Humma",
                        "BIDÓN",
                        "123",
                        "Pasillo 2do Piso",
                        "Sin observaciones"
                ));
            }

            // 4. TÉCNICO: Marcos
            usuarioRepository.findByUsername("marcos")
                    .orElseGet(() -> usuarioRepository.saveAndFlush(new Usuario(
                            "Marcos", "marcos", "pass123", RolUsuario.TECNICO)));

            // 5. REPUESTOS
            cargarRepuestoSiNoExiste("Filtro Carbón Activado", new BigDecimal("4500"));
            cargarRepuestoSiNoExiste("Kit de Mangueras", new BigDecimal("1200"));
            cargarRepuestoSiNoExiste("Canilla Frio/Calor", new BigDecimal("3800"));

            System.out.println("📊 Base de Datos PostgreSQL: ESTADO OK");
            System.out.println("----------------------------------------------");

        } catch (Exception e) {
            System.err.println("❌ Error en DevSeedRunner: " + e.getMessage());
            e.printStackTrace(); // Esto te dirá exactamente qué constructor falló
        }
    }

    private void cargarRepuestoSiNoExiste(String nombre, BigDecimal precio) {
        boolean existe = repuestoRepository.findAll().stream()
                .anyMatch(r -> r.getNombre().equalsIgnoreCase(nombre));

        if (!existe) {
            repuestoRepository.saveAndFlush(new Repuesto(nombre, precio, 10));
            System.out.println("✅ Repuesto cargado: " + nombre);
        }
    }
}