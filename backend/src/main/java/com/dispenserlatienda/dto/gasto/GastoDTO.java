package com.dispenserlatienda.dto.gasto;

import com.dispenserlatienda.domain.CategoriaGasto;
import java.math.BigDecimal;
import java.time.LocalDate;

public record GastoDTO(
        Long id,
        String descripcion,
        BigDecimal monto,
        LocalDate fecha,
        CategoriaGasto categoria
) {}