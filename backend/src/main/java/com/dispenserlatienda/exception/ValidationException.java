package com.dispenserlatienda.exception;

import java.util.HashMap;
import java.util.Map;

/**
 * Excepción para errores de validación de datos.
 *
 * Se lanza cuando:
 * - Campo obligatorio está vacío
 * - Formato de datos es incorrecto
 * - Validación de negocio falla
 * - Ejemplo: Email inválido
 * - Ejemplo: Cantidad debe ser mayor a 0
 *
 * IMPORTANTE: Permite acumular múltiples errores (campo + mensaje).
 * Esto es útil para formularios que validan varios campos a la vez.
 *
 * El GlobalExceptionHandler la captura y retorna todos los errores en JSON.
 *
 * @author Dispenser La Tienda
 * @version 1.0.0
 */
public class ValidationException extends RuntimeException {

    // Map de errores: clave = nombre del campo, valor = mensaje de error
    private final Map<String, String> errors;

    /**
     * Constructor simple con mensaje general.
     */
    public ValidationException(String message) {
        super(message);
        this.errors = new HashMap<>();
    }

    /**
     * Constructor con mensaje y mapa de errores por campo.
     *
     * @param message Mensaje general
     * @param errors Map con errores específicos de cada campo
     */
    public ValidationException(String message, Map<String, String> errors) {
        super(message);
        this.errors = errors != null ? errors : new HashMap<>();
    }

    /**
     * Constructor para un único error de campo.
     *
     * Ejemplo:
     * throw new ValidationException("email", "Email no válido");
     */
    public ValidationException(String field, String errorMessage) {
        super("Validation error: " + field);
        this.errors = new HashMap<>();
        this.errors.put(field, errorMessage);
    }

    /**
     * Retorna el mapa de errores por campo.
     */
    public Map<String, String> getErrors() {
        return errors;
    }

    /**
     * Agregar un error de campo adicional.
     *
     * Útil para acumular errores durante validación.
     */
    public void addError(String field, String message) {
        this.errors.put(field, message);
    }

    /**
     * Verificar si hay errores acumulados.
     */
    public boolean hasErrors() {
        return !errors.isEmpty();
    }

    /**
     * Retorna cantidad de errores acumulados.
     */
    public int getErrorCount() {
        return errors.size();
    }
}