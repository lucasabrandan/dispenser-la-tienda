package com.dispenserlatienda.domain.empresa;

import jakarta.persistence.*;
import java.time.LocalDateTime;

// Conversación de un pedido entre la empresa y el admin (reemplaza los
// comentarios de Trello y los mensajes sueltos de WhatsApp).
@Entity
@Table(name = "pedido_comentario", indexes = {
    @Index(name = "idx_pedido_comentario_pedido", columnList = "pedido_id")
})
public class PedidoComentario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "pedido_id", nullable = false)
    private Long pedidoId;

    @Column(name = "autor_id")
    private Long autorId;

    @Column(name = "autor_nombre", length = 120)
    private String autorNombre;

    // true = lo escribió la empresa; false = Dispenser La Tienda
    @Column(name = "de_empresa", nullable = false)
    private boolean deEmpresa;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String texto;

    @Column(name = "creado_en", nullable = false)
    private LocalDateTime creadoEn = LocalDateTime.now();

    public Long getId() { return id; }
    public Long getPedidoId() { return pedidoId; }
    public void setPedidoId(Long v) { this.pedidoId = v; }
    public Long getAutorId() { return autorId; }
    public void setAutorId(Long v) { this.autorId = v; }
    public String getAutorNombre() { return autorNombre; }
    public void setAutorNombre(String v) { this.autorNombre = v; }
    public boolean isDeEmpresa() { return deEmpresa; }
    public void setDeEmpresa(boolean v) { this.deEmpresa = v; }
    public String getTexto() { return texto; }
    public void setTexto(String v) { this.texto = v; }
    public LocalDateTime getCreadoEn() { return creadoEn; }
}
