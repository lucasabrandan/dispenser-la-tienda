package com.dispenserlatienda.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import java.io.File;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Value("${storage.location}")
    private String storageLocation;

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // Obtener la ruta absoluta
        String absolutePath = new File(storageLocation).getAbsolutePath();

        System.out.println("🔹 WebConfig - Storage Location: " + storageLocation);
        System.out.println("🔹 WebConfig - Absolute Path: " + absolutePath);

        // Mapear /uploads/** a esa ruta
        registry
                .addResourceHandler("/uploads/**")
                .addResourceLocations("file:" + absolutePath + "/")
                .setCachePeriod(0); // Sin cache para desarrollo

        System.out.println("✅ WebConfig - Handlers registrados");
    }
}