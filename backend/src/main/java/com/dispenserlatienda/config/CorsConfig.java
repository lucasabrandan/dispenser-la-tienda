package com.dispenserlatienda.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;

/**
 * CorsFilter a nivel Servlet — corre ANTES del MVC y cubre también las
 * respuestas de error (cuando Spring redirige a /error, el WebMvcConfigurer
 * no agrega los headers CORS y el browser lo reporta como "CORS blocked").
 */
@Configuration
public class CorsConfig {

    @Bean
    public CorsFilter corsFilter() {
        CorsConfiguration config = new CorsConfiguration();
        config.addAllowedOrigin("http://localhost:3000");
        config.addAllowedOrigin("http://192.168.100.2:3000");
        config.addAllowedOrigin("http://100.72.16.36:3000");
        config.addAllowedOrigin("https://gestiondlt.com");
        config.addAllowedOrigin("https://www.gestiondlt.com");
        config.addAllowedOriginPattern("https://*.vercel.app");
        config.addAllowedMethod("*");
        config.addAllowedHeader("*");

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return new CorsFilter(source);
    }
}
