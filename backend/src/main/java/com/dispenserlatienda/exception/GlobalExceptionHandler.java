package com.dispenserlatienda.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.HashMap;
import java.util.Map;

// Maneja excepciones globales en toda la aplicación
// Devuelve respuestas de error consistentes al frontend
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger logger = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    // ============================================
    // 1️⃣ MANEJO: ResourceNotFoundException (404)
    // ============================================
    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleResourceNotFound(
            ResourceNotFoundException ex,
            WebRequest request) {

        logger.warn("❌ Recurso no encontrado: {}", ex.getMessage());

        ErrorResponse error = new ErrorResponse(
                HttpStatus.NOT_FOUND.value(),
                ex.getMessage(),
                "RECURSO_NO_ENCONTRADO"
        );

        return new ResponseEntity<>(error, HttpStatus.NOT_FOUND);
    }

    // ============================================
    // 2️⃣ MANEJO: IllegalArgumentException (400)
    // ============================================
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ErrorResponse> handleIllegalArgument(
            IllegalArgumentException ex,
            WebRequest request) {

        logger.warn("⚠️ Argumento inválido: {}", ex.getMessage());

        ErrorResponse error = new ErrorResponse(
                HttpStatus.BAD_REQUEST.value(),
                ex.getMessage(),
                "ARGUMENTO_INVALIDO"
        );

        return new ResponseEntity<>(error, HttpStatus.BAD_REQUEST);
    }

    // ============================================
    // 3️⃣ MANEJO: MethodArgumentNotValidException (400)
    // Errores de validación (@NotNull, @NotBlank, etc)
    // ============================================
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidationException(
            MethodArgumentNotValidException ex,
            WebRequest request) {

        logger.warn("❌ Error de validación en request");

        ErrorResponse error = new ErrorResponse(
                HttpStatus.BAD_REQUEST.value(),
                "Los datos proporcionados no son válidos",
                "VALIDACION_FALLIDA"
        );

        // Agregar detalles de cada campo que falló la validación
        Map<String, String> erroresPorCampo = new HashMap<>();
        ex.getBindingResult().getAllErrors().forEach(err -> {
            if (err instanceof FieldError) {
                FieldError fieldError = (FieldError) err;
                String nombreCampo = fieldError.getField();
                String mensaje = fieldError.getDefaultMessage();
                erroresPorCampo.put(nombreCampo, mensaje);
                logger.warn("  • Campo '{}': {}", nombreCampo, mensaje);
            }
        });

        error.getDetalles().put("camposInvalidos", erroresPorCampo);
        error.getDetalles().put("cantidadErrores", erroresPorCampo.size());

        return new ResponseEntity<>(error, HttpStatus.BAD_REQUEST);
    }

    // ============================================
    // 4️⃣ MANEJO: DataIntegrityViolationException (409)
    // Violaciones de integridad de BD (ej: unique constraint)
    // ============================================
    @ExceptionHandler(org.springframework.dao.DataIntegrityViolationException.class)
    public ResponseEntity<ErrorResponse> handleDataIntegrityViolation(
            org.springframework.dao.DataIntegrityViolationException ex,
            WebRequest request) {

        logger.warn("⚠️ Violación de integridad en BD: {}", ex.getMessage());

        ErrorResponse error = new ErrorResponse(
                HttpStatus.CONFLICT.value(),
                "Los datos violan una restricción de la base de datos (ej: duplicado único)",
                "CONFLICTO_INTEGRIDAD"
        );

        error.getDetalles().put("causa", "Posiblemente un registro duplicado o referencia inválida");

        return new ResponseEntity<>(error, HttpStatus.CONFLICT);
    }

    // ============================================
    // 5️⃣ MANEJO: Exception genérica (500)
    // Cualquier otra excepción no manejada
    // ============================================
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGenericException(
            Exception ex,
            WebRequest request) {

        logger.error("🔥 ERROR INTERNO DEL SERVIDOR: ", ex);

        ErrorResponse error = new ErrorResponse(
                HttpStatus.INTERNAL_SERVER_ERROR.value(),
                "Error interno del servidor. Por favor, contacte al administrador.",
                "ERROR_INTERNO"
        );

        error.getDetalles().put("excepcion", ex.getClass().getSimpleName());
        error.getDetalles().put("mensajeOriginal", ex.getMessage());

        return new ResponseEntity<>(error, HttpStatus.INTERNAL_SERVER_ERROR);
    }
}
