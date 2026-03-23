package com.dispenserlatienda.exception;

/**
 * Excepción para errores de lógica de negocio.
 *
 * Se lanza cuando:
 * - Una operación viola reglas del negocio
 * - Ejemplo: No se puede eliminar un cliente que tiene servicios pendientes
 * - Ejemplo: No se puede crear venta sin cliente
 * - Ejemplo: Descuento no puede ser mayor a 100%
 *
 * IMPORTANTE: Es una RuntimeException, no necesita try-catch.
 * El GlobalExceptionHandler la captura automáticamente y retorna HTTP 400.
 *
 * @author Dispenser La Tienda
 * @version 1.0.0
 */
public class BusinessException extends RuntimeException {

    private final String code;

    /**
     * Constructor simple con mensaje.
     * El código se establece por defecto a "BUSINESS_ERROR".
     */
    public BusinessException(String message) {
        super(message);
        this.code = "BUSINESS_ERROR";
    }

    /**
     * Constructor con código y mensaje.
     * Permite diferenciar tipos de errores.
     *
     * Ejemplo:
     * throw new BusinessException("INVALID_DISCOUNT", "Descuento no válido");
     */
    public BusinessException(String code, String message) {
        super(message);
        this.code = code;
    }

    /**
     * Constructor con código, mensaje y causa.
     * Útil para encadenar excepciones.
     */
    public BusinessException(String code, String message, Throwable cause) {
        super(message, cause);
        this.code = code;
    }

    /**
     * Retorna el código de error.
     * Usado para identificar el tipo de error en respuestas JSON.
     */
    public String getCode() {
        return code;
    }
}