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
            // ✅ CORRECCIÓN: Agregamos el 7mo parámetro (Condición IVA) para que matchee el constructor
            Cliente cliente = clienteRepository.findByCuilDni("20123456789")
                    .orElseGet(() -> clienteRepository.saveAndFlush(new Cliente(
                            ClienteTipo.EMPRESA,
                            "Sanatorio Guemes",
                            "20123456789",
                            "1122334455",
                            "contacto@guemes.com",
                            "Cliente Seed",            // notas
                            "RESPONSABLE_INSCRIPTO"    // condicionIva (ARCA 2026)
                    )));

            // 2. SEDE: Casa Central
            Sede casaCentral = sedeRepository.findByClienteIdAndNombreSede(cliente.getId(), "Casa Central")
                    .orElseGet(() -> sedeRepository.saveAndFlush(new Sede(
                            cliente, "Casa Central", "Av. Córdoba 3400", "CABA", null)));

            // 3. DISPENSERS
            if (!equipoRepository.existsByNumeroSerie("495050")) {
                equipoRepository.saveAndFlush(new Equipo(casaCentral, "MarcaX", "Premium", "495050", "Piso 1", null));
            }

            if (!equipoRepository.existsByNumeroSerie("123")) {
                equipoRepository.saveAndFlush(new Equipo(casaCentral, "MarcaY", "Estandar", "123", "Piso 2", null));
            }

            // 4. TÉCNICO: Marcos
            usuarioRepository.findByUsername("marcos")
                    .orElseGet(() -> usuarioRepository.saveAndFlush(new Usuario(
                            "Marcos", "marcos", "pass123", RolUsuario.TECNICO)));

            // 5. REPUUESTOS
            cargarRepuestoSiNoExiste("Filtro Carbón Activado", new BigDecimal("4500"));
            cargarRepuestoSiNoExiste("Kit de Mangueras", new BigDecimal("1200"));
            cargarRepuestoSiNoExiste("Canilla Frio/Calor", new BigDecimal("3800"));

            System.out.println("📊 Base de Datos PostgreSQL: ESTADO OK");
            System.out.println("----------------------------------------------");

        } catch (Exception e) {
            System.err.println("⚠️ Nota del Runner: " + e.getMessage());
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