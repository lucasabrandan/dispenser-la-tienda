package com.dispenserlatienda.domain.common;

import jakarta.persistence.*;
import java.io.Serializable;
import java.time.LocalDateTime;

/**
 * Clase base para todas las entidades del dominio.
 *
 * Proporciona:
 * - ID autoincrementable
 * - Auditoría automática (createdAt, updatedAt)
 * - Control de estado activo/inactivo
 * - Métodos comunes equals(), hashCode(), toString()
 *
 * Todas las entidades deben extender esta clase.
 *
 * @author Dispenser La Tienda
 * @version 1.0.0
 */
@MappedSuperclass
public abstract class BaseEntity implements Serializable, Auditable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    protected Long id;

    // Auditoría: fecha de creación (nunca se actualiza)
    @Column(name = "created_at", nullable = false, updatable = false)
    protected LocalDateTime createdAt;

    // Auditoría: fecha de última actualización
    @Column(name = "updated_at")
    protected LocalDateTime updatedAt;

    // Control de activación: false = entidad archivada/inactiva
    @Column(name = "activo", nullable = false)
    protected boolean active = true;

    // ============ CONSTRUCTOR ============
    public BaseEntity() {
        this.createdAt = LocalDateTime.now();
        this.active = true;
    }

    // ============ LIFECYCLE CALLBACKS - AUDITORÍA AUTOMÁTICA ============

    /**
     * Se ejecuta automáticamente ANTES de insertar en BD.
     * Inicializa timestamps de auditoría.
     */
    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    /**
     * Se ejecuta automáticamente ANTES de actualizar en BD.
     * Actualiza el timestamp de modificación.
     */
    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
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

    // ============ MÉTODOS DE AUDITORÍA ============

    @Override
    public String getAuditInfo() {
        return String.format("Creado: %s | Actualizado: %s | Activo: %s",
                createdAt, updatedAt, active);
    }

    // ============ MÉTODOS COMUNES ============

    /**
     * Compara por ID: dos entidades son iguales si tienen el mismo ID.
     * No compara todos los campos para evitar problemas de ciclos en relaciones.
     */
    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        BaseEntity that = (BaseEntity) o;
        return id != null && id.equals(that.id);
    }

    /**
     * Hash basado en ID: consistente con equals().
     */
    @Override
    public int hashCode() {
        return id != null ? id.hashCode() : super.hashCode();
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