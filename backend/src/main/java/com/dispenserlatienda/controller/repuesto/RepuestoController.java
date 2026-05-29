package com.dispenserlatienda.controller.repuesto;

import com.dispenserlatienda.domain.repuesto.Repuesto;
import com.dispenserlatienda.repository.repuesto.RepuestoRepository;
import com.dispenserlatienda.service.servicio.FileStorageService;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.math.BigDecimal;

@RestController
@RequestMapping("/api/repuestos")
@Validated
public class RepuestoController {

    private static final Logger log = LoggerFactory.getLogger(RepuestoController.class);

    private final RepuestoRepository repuestoRepository;
    private final FileStorageService fileStorageService;

    public RepuestoController(RepuestoRepository repuestoRepository, FileStorageService fileStorageService) {
        this.repuestoRepository = repuestoRepository;
        this.fileStorageService = fileStorageService;
    }

    // GET: Listar repuestos con búsqueda opcional por nombre o SKU
    @GetMapping
    public ResponseEntity<Page<Repuesto>> listar(
            @RequestParam(required = false) String busqueda,
            Pageable pageable) {
        if (busqueda != null && !busqueda.isBlank()) {
            return ResponseEntity.ok(repuestoRepository
                    .findByNombreContainingIgnoreCaseOrSkuContainingIgnoreCase(busqueda, busqueda, pageable));
        }
        return ResponseEntity.ok(repuestoRepository.findAll(pageable));
    }

    // POST: Crear repuesto con foto (FormData) ← AGREGADO consumes
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public ResponseEntity<Repuesto> crear(
            @RequestParam("sku") String sku,
            @RequestParam("nombre") String nombre,
            @RequestParam(value = "descripcion", required = false) String descripcion,
            @RequestParam(value = "costo", required = false) BigDecimal costo,
            @RequestParam(value = "porcentajeGanancia", required = false) BigDecimal porcentajeGanancia,
            @RequestParam(value = "porcentajeMarkup", required = false) BigDecimal porcentajeMarkup,
            @RequestParam(value = "precioLista", required = false) BigDecimal precioLista,
            @RequestParam(value = "precio", required = false) BigDecimal precio,
            @RequestParam(value = "costoBlanco", required = false) BigDecimal costoBlanco,
            @RequestParam(value = "porcentajeImpuestos", required = false) BigDecimal porcentajeImpuestos,
            @RequestParam(value = "precioFacturado", required = false) BigDecimal precioFacturado,
            @RequestParam(value = "precioNetoCliente", required = false) BigDecimal precioNetoCliente,
            @RequestParam(value = "precioCantidad", required = false) BigDecimal precioCantidad,
            @RequestParam(value = "cantidadMinima", required = false) Integer cantidadMinima,
            @RequestParam(value = "porcentajeCuotas3", required = false) BigDecimal porcentajeCuotas3,
            @RequestParam(value = "porcentajeCuotas6", required = false) BigDecimal porcentajeCuotas6,
            @RequestParam(value = "stock", required = false, defaultValue = "0") Integer stock,
            @RequestParam(value = "foto", required = false) MultipartFile foto,
            @RequestParam(value = "foto2", required = false) MultipartFile foto2,
            @RequestParam(value = "foto3", required = false) MultipartFile foto3
    ) {
        try {
            Repuesto repuesto = new Repuesto();
            repuesto.setSku(sku);
            repuesto.setNombre(nombre);
            repuesto.setDescripcion(descripcion);
            repuesto.setCosto(costo);
            repuesto.setPorcentajeGanancia(porcentajeGanancia);
            repuesto.setPorcentajeMarkup(porcentajeMarkup);
            repuesto.setPrecioLista(precioLista != null ? precioLista : precio);
            repuesto.setPrecio(precio != null ? precio : precioLista);
            repuesto.setCostoBlanco(costoBlanco);
            repuesto.setPorcentajeImpuestos(porcentajeImpuestos);
            repuesto.setPrecioFacturado(precioFacturado);
            repuesto.setPrecioNetoCliente(precioNetoCliente);
            repuesto.setPrecioCantidad(precioCantidad);
            repuesto.setCantidadMinima(cantidadMinima);
            repuesto.setPorcentajeCuotas3(porcentajeCuotas3);
            repuesto.setPorcentajeCuotas6(porcentajeCuotas6);
            repuesto.setStock(stock < 0 ? 0 : stock);

            if (foto != null && !foto.isEmpty()) {
                repuesto.setFotoUrl(fileStorageService.guardarArchivo(foto));
            }
            if (foto2 != null && !foto2.isEmpty()) {
                repuesto.setFotoUrl2(fileStorageService.guardarArchivo(foto2));
            }
            if (foto3 != null && !foto3.isEmpty()) {
                repuesto.setFotoUrl3(fileStorageService.guardarArchivo(foto3));
            }

            Repuesto guardado = repuestoRepository.save(repuesto);
            return ResponseEntity.status(HttpStatus.CREATED).body(guardado);

        } catch (IOException e) {
            log.error("Error creando repuesto: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // PUT: Editar repuesto con foto
    @PutMapping(value = "/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Repuesto> editar(
            @PathVariable Long id,
            @RequestParam("sku") String sku,
            @RequestParam("nombre") String nombre,
            @RequestParam(value = "descripcion", required = false) String descripcion,
            @RequestParam(value = "costo", required = false) BigDecimal costo,
            @RequestParam(value = "porcentajeGanancia", required = false) BigDecimal porcentajeGanancia,
            @RequestParam(value = "porcentajeMarkup", required = false) BigDecimal porcentajeMarkup,
            @RequestParam(value = "precioLista", required = false) BigDecimal precioLista,
            @RequestParam(value = "precio", required = false) BigDecimal precio,
            @RequestParam(value = "costoBlanco", required = false) BigDecimal costoBlanco,
            @RequestParam(value = "porcentajeImpuestos", required = false) BigDecimal porcentajeImpuestos,
            @RequestParam(value = "precioFacturado", required = false) BigDecimal precioFacturado,
            @RequestParam(value = "precioNetoCliente", required = false) BigDecimal precioNetoCliente,
            @RequestParam(value = "precioCantidad", required = false) BigDecimal precioCantidad,
            @RequestParam(value = "cantidadMinima", required = false) Integer cantidadMinima,
            @RequestParam(value = "porcentajeCuotas3", required = false) BigDecimal porcentajeCuotas3,
            @RequestParam(value = "porcentajeCuotas6", required = false) BigDecimal porcentajeCuotas6,
            @RequestParam(value = "stock", required = false) Integer stock,
            @RequestParam(value = "foto", required = false) MultipartFile foto,
            @RequestParam(value = "foto2", required = false) MultipartFile foto2,
            @RequestParam(value = "foto3", required = false) MultipartFile foto3,
            @RequestParam(value = "eliminarFoto2", required = false, defaultValue = "false") boolean eliminarFoto2,
            @RequestParam(value = "eliminarFoto3", required = false, defaultValue = "false") boolean eliminarFoto3
    ) {
        var repuestoOpt = repuestoRepository.findById(id);
        if (repuestoOpt.isEmpty()) return ResponseEntity.notFound().build();

        Repuesto repuesto = repuestoOpt.get();

        try {
            repuesto.setSku(sku);
            repuesto.setNombre(nombre);
            if (descripcion != null) repuesto.setDescripcion(descripcion);
            repuesto.setCosto(costo);
            repuesto.setPorcentajeGanancia(porcentajeGanancia);
            repuesto.setPorcentajeMarkup(porcentajeMarkup);
            repuesto.setPrecioLista(precioLista != null ? precioLista : precio);
            repuesto.setPrecio(precio != null ? precio : precioLista);
            repuesto.setCostoBlanco(costoBlanco);
            repuesto.setPorcentajeImpuestos(porcentajeImpuestos);
            repuesto.setPrecioFacturado(precioFacturado);
            repuesto.setPrecioNetoCliente(precioNetoCliente);
            repuesto.setPrecioCantidad(precioCantidad);
            repuesto.setCantidadMinima(cantidadMinima);
            repuesto.setPorcentajeCuotas3(porcentajeCuotas3);
            repuesto.setPorcentajeCuotas6(porcentajeCuotas6);
            if (stock != null) repuesto.setStock(stock < 0 ? 0 : stock);

            // Foto principal
            if (foto != null && !foto.isEmpty()) {
                if (repuesto.getFotoUrl() != null) fileStorageService.eliminarArchivo(repuesto.getFotoUrl());
                repuesto.setFotoUrl(fileStorageService.guardarArchivo(foto));
            }
            // Foto 2
            if (foto2 != null && !foto2.isEmpty()) {
                if (repuesto.getFotoUrl2() != null) fileStorageService.eliminarArchivo(repuesto.getFotoUrl2());
                repuesto.setFotoUrl2(fileStorageService.guardarArchivo(foto2));
            } else if (eliminarFoto2 && repuesto.getFotoUrl2() != null) {
                fileStorageService.eliminarArchivo(repuesto.getFotoUrl2());
                repuesto.setFotoUrl2(null);
            }
            // Foto 3
            if (foto3 != null && !foto3.isEmpty()) {
                if (repuesto.getFotoUrl3() != null) fileStorageService.eliminarArchivo(repuesto.getFotoUrl3());
                repuesto.setFotoUrl3(fileStorageService.guardarArchivo(foto3));
            } else if (eliminarFoto3 && repuesto.getFotoUrl3() != null) {
                fileStorageService.eliminarArchivo(repuesto.getFotoUrl3());
                repuesto.setFotoUrl3(null);
            }

            return ResponseEntity.ok(repuestoRepository.save(repuesto));

        } catch (DataIntegrityViolationException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).build();
        } catch (Exception e) {
            log.error("Error editando repuesto {}: {}", id, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // DELETE: Eliminar repuesto
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void eliminar(@PathVariable Long id) {
        repuestoRepository.findById(id).ifPresent(repuesto -> {
            try {
                if (repuesto.getFotoUrl() != null) fileStorageService.eliminarArchivo(repuesto.getFotoUrl());
                if (repuesto.getFotoUrl2() != null) fileStorageService.eliminarArchivo(repuesto.getFotoUrl2());
                if (repuesto.getFotoUrl3() != null) fileStorageService.eliminarArchivo(repuesto.getFotoUrl3());
                repuestoRepository.deleteById(id);
            } catch (IOException e) {
                log.error("Error eliminando fotos del repuesto {}: {}", id, e.getMessage(), e);
            }
        });
    }
}