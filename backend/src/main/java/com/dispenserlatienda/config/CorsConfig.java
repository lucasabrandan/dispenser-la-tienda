package com.dispenserlatienda.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class CorsConfig implements WebMvcConfigurer {

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/**") // Aplica a todas las rutas
                .allowedOrigins("http://localhost:3000") // Deja pasar al Frontend
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS") // Deja usar estos verbos
                .allowedHeaders("*");
    }
}