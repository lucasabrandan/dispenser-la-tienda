package com.dispenserlatienda.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

// Habilita tareas programadas (@Scheduled) — hoy: backup diario de la base (BackupService)
@Configuration
@EnableScheduling
public class SchedulingConfig {
}
