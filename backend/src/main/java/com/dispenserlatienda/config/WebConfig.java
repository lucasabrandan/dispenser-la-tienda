package com.dispenserlatienda.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    // 📂 Traemos la ruta que configuraste en el properties
    @Value("${storage.location}")
    private String storageLocation;

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        // Liberamos el CORS para que el celu (ngrok) pueda hablar con la compu
        registry.addMapping("/**")
                .allowedOrigins("*")
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                .allowedHeaders("*");
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // 🚀 ESTO ES LO QUE FALTA:
        // Cuando el React pida: http://192.168.100.2:8080/fotos/nombre_archivo.jpg
        // Spring Boot lo va a buscar físicamente a la carpeta que definiste.

        registry.addResourceHandler("/uploads/**")
                .addResourceLocations("file:" + storageLocation + "/");
    }
}