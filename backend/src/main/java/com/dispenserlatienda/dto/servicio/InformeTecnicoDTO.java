package com.dispenserlatienda.dto.servicio;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

// Informe por técnico (9-oct-2026): todos los trabajos de un técnico en un período,
// con lo hecho, las fotos y la plata de cada uno. Solo admin (lleva costos internos).
// Ganancia del negocio = parte del negocio de la mano de obra + margen de productos.
public record InformeTecnicoDTO(
    Long tecnicoId,
    String tecnicoNombre,
    LocalDate desde,
    LocalDate hasta,
    int porcentajeImpuestos,
    int porcentajeTecnico,
    BigDecimal rendido,            // cierres del día que entregó y se marcaron recibidos, en el período
    List<Trabajo> trabajos
) {
    public record Trabajo(
        Long servicioId, LocalDate fecha, String estado, String cliente, String direccion,
        String cobro, boolean hecho, boolean porVisita,
        boolean cobrado,               // ya se cobró (cobrado / archivado)
        String cobradoPor,             // TECNICO | NEGOCIO | null (no se sabe)
        boolean cobradoPorDeducido,    // sale de la modalidad, nadie lo marcó
        List<Equipo> equipos,
        BigDecimal total,              // lo que paga el cliente (con descuento)
        BigDecimal productosVenta,     // productos a precio de venta
        BigDecimal productosCosto,     // lo que le cuestan al negocio
        boolean costoIncompleto,       // algún producto sin costo cargado
        BigDecimal impuestos,          // solo con factura
        BigDecimal manoObraNeta,       // total − productos − impuestos
        BigDecimal parteTecnico,
        BigDecimal parteNegocio,
        BigDecimal margenProductos,    // venta − costo de productos
        BigDecimal gananciaNegocio,    // parteNegocio + margenProductos
        BigDecimal margenPorcentaje    // gananciaNegocio / total
    ) {}

    public record Equipo(
        String serie, String modelo, String ubicacion, String trabajo,
        List<Repuesto> repuestos, String fotoAntes, String fotoDespues
    ) {}

    public record Repuesto(String nombre, BigDecimal cantidad, BigDecimal precio, BigDecimal costo) {}
}
