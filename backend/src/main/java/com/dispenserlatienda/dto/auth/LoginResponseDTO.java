package com.dispenserlatienda.dto.auth;

import java.math.BigDecimal;

public record LoginResponseDTO(
    Long id,
    String token,
    String username,
    String nombre,
    String rol,
    String telefono,
    String whatsapp,
    String firma,
    BigDecimal sueldoObjetivo
) {}
