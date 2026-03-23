package com.dispenserlatienda.domain.common;

import java.time.LocalDateTime;

/**
 * Interfaz para marcar entidades que tienen auditoría.
 *
 * Define contrato para:
 * - Fechas de creación y actualización
 * - Estado activo/inactivo
 * - Información de auditoría
 *
 * Las entidades que implementan BaseEntity automáticamente implementan esto.
 *
 * @author Dispenser La Tienda
 * @version 1.0.0
 */
public interface Auditable {

    /**
     * Retorna fecha de creación de la entidad.
     */
    LocalDateTime getCreatedAt();
    void setCreatedAt(LocalDateTime createdAt);

    /**
     * Retorna fecha de última actualización.
     */
    LocalDateTime getUpdatedAt();
    void setUpdatedAt(LocalDateTime updatedAt);

    /**
     * Retorna si la entidad está activa (true) o archivada (false).
     */
    boolean isActive();
    void setActive(boolean active);

    /**
     * Retorna información completa de auditoría en un string.
     * Útil para logging y debugging.
     */
    String getAuditInfo();
}