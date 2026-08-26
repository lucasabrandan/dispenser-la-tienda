package com.dispenserlatienda.dto.servicio;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.math.BigDecimal;

// costo/porcentajeGanancia: se agregan para poder calcular margen real despues
// (antes se ignoraban -- el frontend ya los mandaba en cada linea, pero el
// record no los tenia como campo, asi que Jackson los descartaba silenciosamente
// al persistir repuestosUsados como JSON). Nullable a proposito: las ventas
// viejas guardadas antes de este cambio no lo van a tener.
@JsonIgnoreProperties(ignoreUnknown = true)
public record RepuestoUsadoDTO(
        Long id,
        String nombre,
        String sku,
        String descripcion,
        String fotoUrl,
        Integer cantidad,
        BigDecimal precio,
        BigDecimal subtotal,
        BigDecimal costo,
        BigDecimal porcentajeGanancia
) {}