package com.dispenserlatienda.dto.auth;

public record LoginResponseDTO(
    String token,
    String username,
    String nombre,
    String rol
) {}
