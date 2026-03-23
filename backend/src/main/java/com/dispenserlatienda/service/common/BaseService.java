package com.dispenserlatienda.service.common;

import com.dispenserlatienda.exception.ResourceNotFoundException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.transaction.annotation.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.List;
import java.util.Optional;

/**
 * Clase base genérica para todos los servicios del proyecto.
 *
 * Responsabilidades:
 * - CRUD básico (crear, leer, actualizar, eliminar)
 * - Logging automático de operaciones
 * - Manejo de transacciones
 * - Paginación
 *
 * IMPORTANTE: Los servicios específicos extienden esta clase e implementan
 * métodos adicionales del dominio (cálculos, validaciones especiales, etc).
 *
 * Parámetros genéricos:
 * - E: Tipo de entidad (ej: Venta, Cliente, etc)
 * - R: Tipo de repositorio (ej: VentaRepository, ClienteRepository, etc)
 *
 * @param <E> Tipo de entidad
 * @param <R> Tipo de repositorio
 *
 * @author Dispenser La Tienda
 * @version 1.0.0
 */
public abstract class BaseService<E, R extends JpaRepository<E, Long>> {

    protected final Logger logger = LoggerFactory.getLogger(getClass());
    protected final R repository;

    public BaseService(R repository) {
        this.repository = repository;
    }

    // ============ MÉTODOS CRUD BÁSICOS ============

    /**
     * Obtener una entidad por su ID.
     *
     * @param id ID de la entidad
     * @return Entidad encontrada
     * @throws ResourceNotFoundException si no existe
     */
    @Transactional(readOnly = true)
    public E obtenerPorId(Long id) {
        logger.info("Obteniendo {} con ID: {}", getEntityName(), id);
        return repository.findById(id)
                .orElseThrow(() -> {
                    logger.warn("{} no encontrado con ID: {}", getEntityName(), id);
                    return new ResourceNotFoundException(
                            getEntityName() + " no encontrado con ID: " + id
                    );
                });
    }

    /**
     * Obtener todas las entidades (sin paginación).
     *
     * CUIDADO: Si hay muchos registros, pueden causar problemas de memoria.
     * Usar obtenerTodos(Pageable) cuando sea posible.
     */
    @Transactional(readOnly = true)
    public List<E> obtenerTodos() {
        logger.info("Obteniendo todos los {}", getEntityNamePlural());
        return repository.findAll();
    }

    /**
     * Obtener todas las entidades con paginación.
     *
     * @param pageable Información de paginación (página, tamaño, ordenamiento)
     * @return Página de entidades
     */
    @Transactional(readOnly = true)
    public Page<E> obtenerTodos(Pageable pageable) {
        logger.info("Obteniendo {} paginado: {}", getEntityNamePlural(), pageable);
        return repository.findAll(pageable);
    }

    /**
     * Guardar (crear) una nueva entidad.
     *
     * @param entidad Entidad a guardar
     * @return Entidad guardada (con ID generado)
     */
    @Transactional
    public E guardar(E entidad) {
        logger.info("Guardando nuevo {}", getEntityName());
        return repository.save(entidad);
    }

    /**
     * Actualizar una entidad existente.
     *
     * @param id ID de la entidad a actualizar
     * @param entidad Entidad con nuevos valores
     * @return Entidad actualizada
     * @throws ResourceNotFoundException si no existe
     */
    @Transactional
    public E actualizar(Long id, E entidad) {
        logger.info("Actualizando {} con ID: {}", getEntityName(), id);
        if (!existePorId(id)) {
            throw new ResourceNotFoundException(getEntityName() + " no encontrado con ID: " + id);
        }
        return repository.save(entidad);
    }

    /**
     * Eliminar una entidad por ID.
     *
     * @param id ID de la entidad a eliminar
     * @throws ResourceNotFoundException si no existe
     */
    @Transactional
    public void eliminar(Long id) {
        logger.info("Eliminando {} con ID: {}", getEntityName(), id);
        if (!existePorId(id)) {
            throw new ResourceNotFoundException(getEntityName() + " no encontrado con ID: " + id);
        }
        repository.deleteById(id);
        logger.info("{} eliminado correctamente", getEntityName());
    }

    /**
     * Verificar si existe una entidad con el ID especificado.
     */
    @Transactional(readOnly = true)
    public boolean existePorId(Long id) {
        return repository.existsById(id);
    }

    /**
     * Contar total de entidades en la BD.
     */
    @Transactional(readOnly = true)
    public long contar() {
        return repository.count();
    }

    // ============ MÉTODOS HELPER - Subclases deben implementar ============

    /**
     * Retorna el nombre singular de la entidad (para logs).
     * DEBE ser implementado por las subclases.
     *
     * Ejemplo: "Venta", "Cliente", "Servicio"
     */
    protected abstract String getEntityName();

    /**
     * Retorna el nombre plural de la entidad (para logs).
     * Por defecto agrega "s" al singular.
     */
    protected String getEntityNamePlural() {
        return getEntityName() + "s";
    }

    /**
     * Obtener el repositorio.
     * Usado por subclases para acceso directo.
     */
    protected R getRepository() {
        return repository;
    }

    /**
     * Obtener el logger.
     * Usado por subclases para logging.
     */
    protected Logger getLogger() {
        return logger;
    }

    // ============ MÉTODOS HELPER - Utilidades ============

    /**
     * Obtener una entidad de forma opcional (sin excepción).
     *
     * @param id ID a buscar
     * @return Optional con la entidad si existe, vacío si no
     */
    @Transactional(readOnly = true)
    public Optional<E> obtenerOpcional(Long id) {
        return repository.findById(id);
    }

    /**
     * Validar que una entidad no sea nula.
     *
     * @param entidad Entidad a validar
     * @param mensaje Mensaje de error si es nula
     * @throws IllegalArgumentException si entidad es nula
     */
    protected void validarNoNula(E entidad, String mensaje) {
        if (entidad == null) {
            throw new IllegalArgumentException(mensaje);
        }
    }

    /**
     * Validar que un ID sea válido (no nulo, mayor que 0).
     *
     * @param id ID a validar
     * @throws IllegalArgumentException si ID no es válido
     */
    protected void validarId(Long id) {
        if (id == null || id <= 0) {
            throw new IllegalArgumentException("ID no válido: " + id);
        }
    }
}