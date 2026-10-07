package com.dispenserlatienda.domain.usuario;

public enum RolUsuario {
    ADMIN,
    TECNICO,
    // Portal Empresa (7-oct-2026): un cliente empresa que carga pedidos y sigue
    // sus visitas. Solo ve lo suyo (ver EmpresaAislamientoFilter).
    EMPRESA
}
