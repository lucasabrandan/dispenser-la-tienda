package com.dispenserlatienda.dto.base;

import java.time.LocalDateTime;

/**
 * Clase base para todos los DTOs del proyecto.
 *
 * Proporciona:
 * - ID de la entidad
 * - Información de auditoría (createdAt, updatedAt)
 * - Estado activo (true = activa, false = archivada)
 *
 * Todos los DTOs deben extender esta clase para consistencia.
 * Esto facilita:
 * - Serialización JSON consistente
 * - Validaciones comunes
 * - Manejo de auditoría en respuestas
 *
 * @author Dispenser La Tienda
 * @version 1.0.0
 */
public abstract class BaseDTO {

    protected Long id;
    protected LocalDateTime createdAt;
    protected LocalDateTime updatedAt;
    protected boolean active;

    // ============ CONSTRUCTOR VACÍO ============
    public BaseDTO() {
    }

    // ============ CONSTRUCTOR CON AUDITORÍA ============
    public BaseDTO(Long id, LocalDateTime createdAt, LocalDateTime updatedAt, boolean active) {
        this.id = id;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
        this.active = active;
    }

    // ============ GETTERS & SETTERS ============
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

    public boolean isActive() {
        return active;
    }

    public void setActive(boolean active) {
        this.active = active;
    }

    // ============ MÉTODOS COMUNES ============

    /**
     * Verifica si la entidad está archivada (no activa).
     */
    public boolean isArchived() {
        return !active;
    }

    /**
     * Representación en texto para debugging.
     */
    @Override
    public String toString() {
        return getClass().getSimpleName() + " {" +
                "id=" + id +
                ", createdAt=" + createdAt +
                ", updatedAt=" + updatedAt +
                ", active=" + active +
                '}';
    }
}