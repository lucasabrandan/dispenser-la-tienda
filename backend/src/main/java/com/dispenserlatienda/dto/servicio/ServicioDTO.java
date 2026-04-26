package com.dispenserlatienda.dto.servicio;

import java.util.List;

public record ServicioDTO(
        Long id,
        String fecha,
        String servicioTipo,
        Long clienteId,
        String clienteNombre,
        String clienteTelefono,
        String clienteEmail,
        String clienteDni,
        String clienteCondicionIva,
        Long sedeId,
        String sedeNombre,
        String sedeDireccion,
        List<ServicioItemDTO> items,
        String estado,
        String fotoRemito,
        java.math.BigDecimal descuentoPorcentaje,
        String observaciones,
        String nroDocumento,
        Long usuarioId,
        String usuarioNombre,
        String modificadoPorNombre,
        String fechaModificacion,
        Long presupuestoOrigenId
) {}
