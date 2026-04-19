package com.dispenserlatienda.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

/**
 * CORS como CorsConfigurationSource — Spring Security lo integra directo
 * via .cors(withDefaults()) y maneja los preflight automáticamente.
 */
@Configuration
public class CorsConfig {

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
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
        return source;
    }
}
