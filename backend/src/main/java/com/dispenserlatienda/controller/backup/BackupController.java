package com.dispenserlatienda.controller.backup;

import com.dispenserlatienda.service.backup.BackupService;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/** Estado del backup diario y "Hacer backup ahora" — /api/admin/** ya es solo ADMIN (SecurityConfig). */
@RestController
@RequestMapping("/api/admin/backup")
public class BackupController {

    private final BackupService backupService;

    public BackupController(BackupService backupService) {
        this.backupService = backupService;
    }

    @GetMapping
    public Map<String, Object> estado() {
        return backupService.estado();
    }

    @PostMapping("/ahora")
    public Map<String, Object> ahora() {
        return backupService.ejecutar("manual");
    }
}
