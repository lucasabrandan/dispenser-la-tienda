package com.dispenserlatienda.dto.usuario;

public record UsuarioDTO(Long id, String nombre, String username, String rol, boolean activo, String telefono, String whatsapp, String firma) {}
