package com.dispenserlatienda.dto.empresa;

public record PedidoEmpresaCreateDTO(
    Long sedeId,
    String lugar,
    String direccion,
    String equipoSerie,
    String motivo,
    String detalle,
    Boolean urgente,
    java.util.List<String> fotos,
    // Carga guiada (10-oct-2026)
    ClienteNuevo clienteNuevo,
    java.util.List<EquipoPedido> equipos,
    java.util.List<Ventana> ventanas
) {
    // Cliente de la empresa que todavía no está cargado: se crea como un lugar (sede) suyo
    public record ClienteNuevo(String nombre, String calle, String numero, String piso, String depto,
                               String localidad, String notas) {}
    public record EquipoPedido(String serie, String modelo, String ubicacion, String motivo) {}
    public record Ventana(String dia, String franja) {}
}
