package com.dispenserlatienda.dto.gasto;

import com.dispenserlatienda.domain.CategoriaGasto;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.LocalDate;

public record GastoCreateDTO(
        @NotBlank String descripcion,
        @NotNull BigDecimal monto,
        @NotNull LocalDate fecha,
        @NotNull CategoriaGasto categoria
) {}