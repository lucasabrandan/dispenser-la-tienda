package com.dispenserlatienda.config;

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

    public SecurityConfig(JwtFilter jwtFilter) {
        this.jwtFilter = jwtFilter;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .cors(withDefaults())
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                // Rutas públicas
                .requestMatchers("/api/auth/**").permitAll()
                .requestMatchers("/health").permitAll()
                .requestMatchers("/actuator/**").permitAll()
                .requestMatchers("/uploads/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/uploads/**").permitAll()

                // Solo ADMIN: gestión de usuarios
                .requestMatchers("/api/admin/**").hasRole("ADMIN")

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
                .requestMatchers("/api/ventas/**").hasRole("ADMIN")

                // Solo ADMIN: operaciones destructivas
                .requestMatchers(HttpMethod.DELETE, "/api/clientes/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.DELETE, "/api/sedes/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.DELETE, "/api/equipos/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.DELETE, "/api/repuestos/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.DELETE, "/api/servicios/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.PUT, "/api/clientes/**").hasRole("ADMIN")

                // Resto: cualquier usuario autenticado
                .anyRequest().authenticated()
            )
            .exceptionHandling(e -> e
                // Sin token válido → 401 (no 403), para que el frontend haga logout automático
                .authenticationEntryPoint((req, res, ex) ->
                    res.sendError(HttpServletResponse.SC_UNAUTHORIZED, "No autenticado"))
            )
            .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);

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
