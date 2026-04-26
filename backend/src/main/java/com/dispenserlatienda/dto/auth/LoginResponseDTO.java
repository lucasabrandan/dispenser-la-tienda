package com.dispenserlatienda.dto.auth;

public record LoginResponseDTO(
    Long id,
    String token,
    String username,
    String nombre,
    String rol,
    String telefono,
    String whatsapp,
    String firma
) {}
