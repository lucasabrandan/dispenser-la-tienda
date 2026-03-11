package com.dispenserlatienda.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

// Esta clase configura handlers para servir archivos estáticos (fotos guardadas)
// La configuración de CORS se mantiene SOLO en CorsConfig.java
// Solo una clase debe configurar CORS para evitar conflictos.
@Configuration
public class WebConfig implements WebMvcConfigurer {

    // Traemos la ruta de almacenamiento desde application.properties
    @Value("${storage.location}")
    private String storageLocation;

    // Este método permite que el frontend acceda a los archivos subidos
    // Ejemplo: GET /uploads/uuid_nombre_archivo.jpg
    // → busca físicamente en la carpeta ${storage.location}/uuid_nombre_archivo.jpg
    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        registry.addResourceHandler("/uploads/**")
                .addResourceLocations("file:" + storageLocation + "/");
    }


}