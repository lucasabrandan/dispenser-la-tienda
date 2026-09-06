package com.dispenserlatienda.domain.servicio;

import com.dispenserlatienda.domain.sede.Sede;
import com.dispenserlatienda.domain.usuario.Usuario;
import jakarta.persistence.*;
import org.hibernate.annotations.Formula;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "servicio")
public class Servicio {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "sede_id", nullable = false)
    private Sede sede;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;

    @Column(name = "fecha_servicio", nullable = false)
    private LocalDate fechaServicio;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ServicioTipo servicioTipo;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 25)
    private EstadoServicio estado = EstadoServicio.PRESUPUESTO;

    @Enumerated(EnumType.STRING)
    @Column(name = "modalidad_cobro", length = 25)
    private ModalidadCobro modalidadCobro;

    @Column(name = "monto_final")
    private BigDecimal montoFinal;

    @Column(name = "fecha_completado")
    private LocalDateTime fechaCompletado;

    @Column(name = "fecha_facturacion")
    private LocalDateTime fechaFacturacion;

    @Column(name = "fecha_cobro")
    private LocalDateTime fechaCobro;

    @Column(name = "datos_bancarios_enviados")
    private Boolean datosBancariosEnviados;

    @Column(name = "es_visita")
    private Boolean esVisita;

    @Column(name = "abono_visita")
    private BigDecimal abonoVisita;

    @Column(name = "presupuesto_visita_id")
    private Long presupuestoVisitaId;

    @Column(name = "cliente_nombre")
    private String clienteNombre;

    @Column(name = "sede_nombre")
    private String sedeNombre;

    @Column(length = 1000)
    private String observaciones;

    @Column(name = "foto_remito")
    private String fotoRemito;

    @Column(name = "descuento_porcentaje")
    private java.math.BigDecimal descuentoPorcentaje;

    // Número de documento generado al crear el PDF (PP-1304-LB-01 / RS-...)
    @Column(name = "nro_documento", length = 30)
    private String nroDocumento;

    // ID del presupuesto a partir del cual se generó este servicio (opcional)
    @Column(name = "presupuesto_origen_id")
    private Long presupuestoOrigenId;

    // ID de la orden de visita vinculada (opcional)
    @Column(name = "orden_id")
    private Long ordenId;

    @Column(name = "creado_en")
    private LocalDateTime creadoEn;

    @Column(name = "modificado_por_nombre", length = 120)
    private String modificadoPorNombre;

    @Column(name = "fecha_modificacion")
    private LocalDateTime fechaModificacion;

    @Column(name = "duracion_minutos")
    private Integer duracionMinutos;

    @Column(name = "acepta_terminos")
    private Boolean aceptaTerminos;

    // Disponibilidad tentativa (Lucas, 2-sep): el admin puede asignar un
    // tecnico sin fecha/hora exacta todavia, marcando en cambio que dias y
    // franjas horarias le sirven al cliente (hablado antes por telefono).
    // El tecnico asignado confirma despues, dentro de esas franjas, el
    // dia y hora exactos (ver Servicio.confirmarHorario en ServicioService).
    @Column(name = "fecha_tentativa")
    private Boolean fechaTentativa;

    // JSON: [{"dia":"MIERCOLES","franja":"10:00-12:00"}, ...] — mismo patron
    // que ServicioItem.repuestosUsados (blob JSON en un TEXT, sin tabla propia
    // porque es informacion chica y de un solo uso, no se reutiliza en otro
    // lado ni se filtra/busca por ella).
    @Column(name = "ventanas_disponibles", columnDefinition = "TEXT")
    private String ventanasDisponibles;

    // Hora del servicio (HH:mm) — Servicio nunca tuvo horario, solo fecha;
    // se completa cuando el tecnico confirma dentro de la ventana (o el
    // admin la carga directo, si no uso fecha tentativa).
    @Column(name = "hora_servicio", length = 5)
    private String horaServicio;

    // Idempotencia del descuento de stock (bug real encontrado 6-sep: el stock
    // de un repuesto nunca se restaba al confirmar una venta o un servicio con
    // repuestos usados). Se marca en true la primera vez que el servicio entra
    // a un estado de "trabajo terminado" y ya se descontó -- a nivel Servicio,
    // no de ServicioItem, porque editar un servicio borra y recrea sus items
    // (ver ServicioService.actualizarServicio), y un flag por item se perdería
    // en cada edición, provocando un doble descuento. Ver
    // ServicioService.descontarStockSiCorresponde().
    @Column(name = "stock_descontado")
    private Boolean stockDescontado = false;

    @Formula("(SELECT COALESCE(SUM(si.costo), 0) FROM servicio_items si WHERE si.servicio_id = id)")
    private BigDecimal total;

    @OneToMany(mappedBy = "servicio", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("id ASC")
    private List<ServicioItem> items = new ArrayList<>();

    public Servicio() {}

    public Servicio(Sede sede, Usuario usuario, LocalDate fechaServicio, ServicioTipo servicioTipo) {
        this.sede = sede;
        this.usuario = usuario;
        this.fechaServicio = fechaServicio;
        this.servicioTipo = servicioTipo;
    }

    public void addItem(ServicioItem item) {
        this.items.add(item);
        item.setServicio(this);
    }

    // --- Getters y Setters ---
    public Long getId() { return id; }

    public void setSede(Sede sede) { this.sede = sede; }
    public Sede getSede() { return sede; }

    public void setUsuario(Usuario usuario) { this.usuario = usuario; }
    public Usuario getUsuario() { return usuario; }

    // CAMBIO: getter y setter ahora usan EstadoServicio en lugar de String
    public EstadoServicio getEstado() { return estado; }
    public void setEstado(EstadoServicio estado) { this.estado = estado; }

    public List<ServicioItem> getItems() { return items; }

    public LocalDate getFechaServicio() { return fechaServicio; }
    public void setFechaServicio(LocalDate fechaServicio) { this.fechaServicio = fechaServicio; }

    public ServicioTipo getServicioTipo() { return servicioTipo; }
    public void setServicioTipo(ServicioTipo servicioTipo) { this.servicioTipo = servicioTipo; }

    public String getClienteNombre() { return clienteNombre; }
    public void setClienteNombre(String clienteNombre) { this.clienteNombre = clienteNombre; }

    public String getSedeNombre() { return sedeNombre; }
    public void setSedeNombre(String sedeNombre) { this.sedeNombre = sedeNombre; }

    public String getFotoRemito() { return fotoRemito; }
    public void setFotoRemito(String fotoRemito) { this.fotoRemito = fotoRemito; }

    public java.math.BigDecimal getDescuentoPorcentaje() { return descuentoPorcentaje; }
    public void setDescuentoPorcentaje(java.math.BigDecimal descuentoPorcentaje) { this.descuentoPorcentaje = descuentoPorcentaje; }

    public String getObservaciones() { return observaciones; }
    public void setObservaciones(String observaciones) { this.observaciones = observaciones; }

    public String getNroDocumento() { return nroDocumento; }
    public void setNroDocumento(String nroDocumento) { this.nroDocumento = nroDocumento; }

    public LocalDateTime getCreadoEn() { return creadoEn; }
    public void setCreadoEn(LocalDateTime creadoEn) { this.creadoEn = creadoEn; }

    public String getModificadoPorNombre() { return modificadoPorNombre; }
    public void setModificadoPorNombre(String modificadoPorNombre) { this.modificadoPorNombre = modificadoPorNombre; }

    public LocalDateTime getFechaModificacion() { return fechaModificacion; }
    public void setFechaModificacion(LocalDateTime fechaModificacion) { this.fechaModificacion = fechaModificacion; }

    public Integer getDuracionMinutos() { return duracionMinutos; }
    public void setDuracionMinutos(Integer duracionMinutos) { this.duracionMinutos = duracionMinutos; }

    public BigDecimal getTotal() { return total; }

    public Long getPresupuestoOrigenId() { return presupuestoOrigenId; }
    public void setPresupuestoOrigenId(Long presupuestoOrigenId) { this.presupuestoOrigenId = presupuestoOrigenId; }

    public Long getOrdenId() { return ordenId; }
    public void setOrdenId(Long ordenId) { this.ordenId = ordenId; }

    public ModalidadCobro getModalidadCobro() { return modalidadCobro; }
    public void setModalidadCobro(ModalidadCobro modalidadCobro) { this.modalidadCobro = modalidadCobro; }

    public BigDecimal getMontoFinal() { return montoFinal; }
    public void setMontoFinal(BigDecimal montoFinal) { this.montoFinal = montoFinal; }

    public LocalDateTime getFechaCompletado() { return fechaCompletado; }
    public void setFechaCompletado(LocalDateTime fechaCompletado) { this.fechaCompletado = fechaCompletado; }

    public LocalDateTime getFechaFacturacion() { return fechaFacturacion; }
    public void setFechaFacturacion(LocalDateTime fechaFacturacion) { this.fechaFacturacion = fechaFacturacion; }

    public LocalDateTime getFechaCobro() { return fechaCobro; }
    public void setFechaCobro(LocalDateTime fechaCobro) { this.fechaCobro = fechaCobro; }

    public Boolean getDatosBancariosEnviados() { return datosBancariosEnviados; }
    public void setDatosBancariosEnviados(Boolean datosBancariosEnviados) { this.datosBancariosEnviados = datosBancariosEnviados; }

    public Boolean getEsVisita() { return esVisita; }
    public void setEsVisita(Boolean esVisita) { this.esVisita = esVisita; }

    public BigDecimal getAbonoVisita() { return abonoVisita; }
    public void setAbonoVisita(BigDecimal abonoVisita) { this.abonoVisita = abonoVisita; }

    public Long getPresupuestoVisitaId() { return presupuestoVisitaId; }
    public void setPresupuestoVisitaId(Long presupuestoVisitaId) { this.presupuestoVisitaId = presupuestoVisitaId; }

    public Boolean getAceptaTerminos() { return aceptaTerminos; }
    public void setAceptaTerminos(Boolean aceptaTerminos) { this.aceptaTerminos = aceptaTerminos; }

    public Boolean getFechaTentativa() { return fechaTentativa; }
    public void setFechaTentativa(Boolean fechaTentativa) { this.fechaTentativa = fechaTentativa; }

    public String getVentanasDisponibles() { return ventanasDisponibles; }
    public void setVentanasDisponibles(String ventanasDisponibles) { this.ventanasDisponibles = ventanasDisponibles; }

    public Boolean getStockDescontado() { return stockDescontado; }
    public void setStockDescontado(Boolean stockDescontado) { this.stockDescontado = stockDescontado; }

    public String getHoraServicio() { return horaServicio; }
    public void setHoraServicio(String horaServicio) { this.horaServicio = horaServicio; }
}