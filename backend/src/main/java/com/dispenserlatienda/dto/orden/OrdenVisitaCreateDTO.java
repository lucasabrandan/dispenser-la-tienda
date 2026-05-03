package com.dispenserlatienda.dto.orden;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;

public record OrdenVisitaCreateDTO(
    @NotNull  Long tecnicoId,
    @NotBlank String titulo,
    String descripcion,
    String direccion,
    String clienteNombre,
    String clienteTelefono,
    String prioridad,
    @NotNull LocalDate fechaProgramada,
    String horaEstimada,
    java.math.BigDecimal montoEstimado,
    String formaPago,
    Long presupuestoId
) {}
