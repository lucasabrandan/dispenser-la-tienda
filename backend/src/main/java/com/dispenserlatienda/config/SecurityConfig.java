package com.dispenserlatienda.config;

import com.dispenserlatienda.security.EmpresaAislamientoFilter;
import com.dispenserlatienda.security.JwtFilter;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

import static org.springframework.security.config.Customizer.withDefaults;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final JwtFilter jwtFilter;
    private final EmpresaAislamientoFilter empresaFilter;
    private final com.dispenserlatienda.security.IdempotenciaFilter idempotenciaFilter;

    public SecurityConfig(JwtFilter jwtFilter) {
        this.jwtFilter = jwtFilter;
        this.empresaFilter = new EmpresaAislamientoFilter();
        this.idempotenciaFilter = new com.dispenserlatienda.security.IdempotenciaFilter();
    }

    // Respuesta JSON directa (sin sendError): sendError reenvía a /error y ahí, sin
    // usuario, Spring Security convertía cualquier 403 en 401 → la app creía que la
    // sesión había vencido y podía desloguear (testeo integral A4, 7-oct-2026).
    private static void responder(HttpServletResponse res, int status, String mensaje, String tipo) throws java.io.IOException {
        res.setStatus(status);
        res.setContentType("application/json;charset=UTF-8");
        res.getWriter().write("{\"status\":" + status + ",\"mensaje\":\"" + mensaje + "\",\"tipo\":\"" + tipo + "\"}");
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .cors(withDefaults())
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                // Rutas públicas
                .dispatcherTypeMatchers(jakarta.servlet.DispatcherType.ERROR).permitAll()
                .requestMatchers("/error").permitAll()
                .requestMatchers("/api/auth/**").permitAll()
                .requestMatchers("/health").permitAll()
                .requestMatchers("/actuator/**").permitAll()
                .requestMatchers("/uploads/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/uploads/**").permitAll()

                // Solo ADMIN: gestión de usuarios
                .requestMatchers("/api/admin/**").hasRole("ADMIN")

                // Portal Empresa (7-oct-2026): el portal es solo de la empresa y la
                // bandeja de pedidos solo del admin. El resto de la API se le corta
                // a la empresa en EmpresaAislamientoFilter.
                .requestMatchers("/api/empresa/**").hasRole("EMPRESA")
                .requestMatchers("/api/pedidos-empresa/**").hasRole("ADMIN")
                .requestMatchers("/api/mapa/**").hasRole("ADMIN")

                // Mi Espacio (notas kanban personales) -- antes solo ADMIN, ahora
                // cualquier usuario autenticado (Lucas, 7-sep-2026: sumarlo tambien a
                // Mi Agenda del tecnico). El controller ya resuelve el usuario por
                // auth.getName() y guarda un blob propio por usuario -- no hacia falta
                // ningun cambio ahi, cada uno ya tenia su espacio aislado.
                //
                // Solo ADMIN: ver el checklist de cada tecnico (Lucas, 8-sep-2026) --
                // esta regla mas especifica tiene que ir ANTES que la general de abajo,
                // Spring Security evalua los matchers en orden y usa el primero que
                // matchea.
                .requestMatchers("/api/mi-espacio/admin/**").hasRole("ADMIN")
                .requestMatchers("/api/mi-espacio/**").authenticated()

                // Solo ADMIN: radar de mantenimiento
                .requestMatchers("/api/radar/**").hasRole("ADMIN")

                // Solo ADMIN: agenda global de todos los tecnicos
                .requestMatchers("/api/notas-agenda/all").hasRole("ADMIN")

                // Solo ADMIN: finanzas sensibles
                .requestMatchers("/api/gastos/**").hasRole("ADMIN")
                .requestMatchers("/api/ventas/stats/**").hasRole("ADMIN")
                // Sueldo accesible para todos (cada user ve el suyo)
                .requestMatchers("/api/servicios/stats/sueldo").authenticated()
                .requestMatchers("/api/servicios/stats/**").hasRole("ADMIN")
                // Solo ADMIN: vista comparativa de rendimiento de todos los tecnicos
                // (el rendimiento individual de cada tecnico sigue en
                // /api/servicios/tecnico/{id}/rendimiento, chequeado por dueño
                // dentro del controller, no aca)
                .requestMatchers("/api/servicios/rendimiento/**").hasRole("ADMIN")
                .requestMatchers("/api/ventas/**").hasRole("ADMIN")

                // Solo ADMIN: operaciones destructivas
                // Limpieza del técnico (4-oct-2026): precios, stock, configuración,
                // importaciones, alta de clientes, alta de visitas y listados completos
                // de clientes/sedes son del admin. El técnico ve las sedes de SU
                // cliente (/api/sedes/cliente/{id}) y crea sedes/equipos en el lugar.
                .requestMatchers("/api/notificaciones/por-trabajo/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.POST, "/api/repuestos", "/api/repuestos/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.PUT, "/api/repuestos/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.PATCH, "/api/repuestos/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.PUT, "/api/configuracion", "/api/configuracion/**").hasRole("ADMIN")
                .requestMatchers("/api/importacion/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.POST, "/api/ordenes").hasRole("ADMIN")
                .requestMatchers(HttpMethod.GET, "/api/clientes").hasRole("ADMIN")
                // Datos de un cliente (teléfono, mail): solo admin (5-oct-2026)
                .requestMatchers(HttpMethod.GET, "/api/clientes/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.POST, "/api/clientes").hasRole("ADMIN")
                .requestMatchers(HttpMethod.GET, "/api/sedes").hasRole("ADMIN")
                .requestMatchers(HttpMethod.DELETE, "/api/clientes/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.DELETE, "/api/sedes/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.DELETE, "/api/equipos/**").hasRole("ADMIN")
                // Testeo integral 7-oct-2026 (C2): listar todos los equipos, editarlos
                // (moverlos de cliente) y restaurarlos es del admin
                .requestMatchers(HttpMethod.GET, "/api/equipos").hasRole("ADMIN")
                .requestMatchers(HttpMethod.PUT, "/api/equipos/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.PATCH, "/api/equipos/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.DELETE, "/api/repuestos/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.DELETE, "/api/servicios/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.PUT, "/api/clientes/**").hasRole("ADMIN")

                // Órdenes: el técnico solo usa /mias, /historial y /{id}/estado (chequeados
                // por dueño en el controller). Listar TODAS, editar o borrar es de admin.
                .requestMatchers(HttpMethod.GET, "/api/ordenes").hasRole("ADMIN")
                .requestMatchers(HttpMethod.PUT, "/api/ordenes/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.DELETE, "/api/ordenes/**").hasRole("ADMIN")

                // Resto: cualquier usuario autenticado
                .anyRequest().authenticated()
            )
            .exceptionHandling(e -> e
                // Sin token válido → 401 (no 403), para que el frontend haga logout automático
                .authenticationEntryPoint((req, res, ex) ->
                    responder(res, HttpServletResponse.SC_UNAUTHORIZED, "No autenticado", "NO_AUTENTICADO"))
                // Con sesión válida pero sin permiso → 403 real (no "sesión vencida")
                .accessDeniedHandler((req, res, ex) ->
                    responder(res, HttpServletResponse.SC_FORBIDDEN, "No tenés permiso para esto", "ACCESS_DENIED"))
            )
            .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class)
            .addFilterAfter(empresaFilter, JwtFilter.class)
            .addFilterAfter(idempotenciaFilter, EmpresaAislamientoFilter.class);

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }
}
