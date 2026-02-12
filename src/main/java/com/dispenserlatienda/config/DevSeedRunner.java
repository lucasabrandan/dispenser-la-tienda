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
    private final ServicioService servicioService;

    public DevSeedRunner(ClienteRepository clienteRepository,
                         SedeRepository sedeRepository,
                         EquipoRepository equipoRepository,
                         UsuarioRepository usuarioRepository,
                         ServicioService servicioService) {
        this.clienteRepository = clienteRepository;
        this.sedeRepository = sedeRepository;
        this.equipoRepository = equipoRepository;
        this.usuarioRepository = usuarioRepository;
        this.servicioService = servicioService;
    }

    @Override
    public void run(String... args) {

        // 1) Cliente
        Cliente cliente = new Cliente(ClienteTipo.EMPRESA, "Cliente Demo", "20123456789", "1122334455", "demo@demo.com", null);
        cliente = clienteRepository.save(cliente);

        // 2) Sede
        Sede sede = new Sede(cliente, "Casa Central", "Av. Siempre Viva 123", "Lanús", null);
        sede = sedeRepository.save(sede);

        // 3) Equipo
        Equipo equipo = new Equipo(sede, "MarcaX", "ModeloY", "495050", "Recepción", null);
        equipo = equipoRepository.save(equipo);

        // 4) Usuario (técnico)
        Usuario tecnico = new Usuario("Marcos", "marcos", "hash-demo", RolUsuario.TECNICO);
        tecnico = usuarioRepository.save(tecnico);

        // 5) Servicio + Item (con garantía automática)
        ServicioItem item = servicioService.crearServicioConUnItem(
                sede.getId(),
                tecnico.getId(),
                equipo.getId(),
                LocalDate.now(),
                ServicioTipo.REPARACION,
                TrabajoTipo.REPARACION,
                "Se cambió válvula y se probó funcionamiento"
        );

        System.out.println("✅ ServicioItem creado. Garantía hasta: " + item.getGarantiaHasta());
    }
}
