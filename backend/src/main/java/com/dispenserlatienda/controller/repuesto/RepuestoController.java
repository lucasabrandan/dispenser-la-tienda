package com.dispenserlatienda.controller.repuesto;

import com.dispenserlatienda.domain.repuesto.Repuesto;
import com.dispenserlatienda.repository.repuesto.RepuestoRepository;
import com.dispenserlatienda.service.servicio.FileStorageService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.math.BigDecimal;

/**
 * RepuestoController
 * Gestiona repuestos con soporte para fotos y cálculo de precios
 */
@RestController
@RequestMapping("/api/repuestos")
@Validated
public class RepuestoController {

    private final RepuestoRepository repuestoRepository;
    private final FileStorageService fileStorageService;

    public RepuestoController(RepuestoRepository repuestoRepository, FileStorageService fileStorageService) {
        this.repuestoRepository = repuestoRepository;
        this.fileStorageService = fileStorageService;
    }

    // GET: Listar todos los repuestos con paginación
    @GetMapping
    public ResponseEntity<Page<Repuesto>> listar(Pageable pageable) {
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
            @RequestParam(value = "stock", required = false, defaultValue = "0") Integer stock,
            @RequestParam(value = "foto", required = false) MultipartFile foto
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
            repuesto.setStock(stock < 0 ? 0 : stock);

            // Guardar foto si se proporciona
            if (foto != null && !foto.isEmpty()) {
                String nombreFoto = fileStorageService.guardarArchivo(foto);
                repuesto.setFotoUrl(nombreFoto);
            }

            Repuesto guardado = repuestoRepository.save(repuesto);
            return ResponseEntity.status(HttpStatus.CREATED).body(guardado);

        } catch (IOException e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // PUT: Editar repuesto con foto ← AGREGADO consumes
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
            @RequestParam(value = "stock", required = false, defaultValue = "0") Integer stock,
            @RequestParam(value = "foto", required = false) MultipartFile foto
    ) {
        var repuestoOpt = repuestoRepository.findById(id);

        if (repuestoOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Repuesto repuesto = repuestoOpt.get();

        try {
            repuesto.setSku(sku);
            repuesto.setNombre(nombre);
            repuesto.setDescripcion(descripcion);
            repuesto.setCosto(costo);
            repuesto.setPorcentajeGanancia(porcentajeGanancia);
            repuesto.setPorcentajeMarkup(porcentajeMarkup);
            repuesto.setPrecioLista(precioLista != null ? precioLista : precio);
            repuesto.setPrecio(precio != null ? precio : precioLista);
            repuesto.setStock(stock < 0 ? 0 : stock);

            // Actualizar foto si se proporciona
            if (foto != null && !foto.isEmpty()) {
                // Eliminar foto anterior si existe
                if (repuesto.getFotoUrl() != null) {
                    fileStorageService.eliminarArchivo(repuesto.getFotoUrl());
                }
                String nombreFoto = fileStorageService.guardarArchivo(foto);
                repuesto.setFotoUrl(nombreFoto);
            }

            Repuesto actualizado = repuestoRepository.save(repuesto);
            return ResponseEntity.ok(actualizado);

        } catch (IOException e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // DELETE: Eliminar repuesto
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void eliminar(@PathVariable Long id) {
        repuestoRepository.findById(id).ifPresent(repuesto -> {
            try {
                // Eliminar foto si existe
                if (repuesto.getFotoUrl() != null) {
                    fileStorageService.eliminarArchivo(repuesto.getFotoUrl());
                }
                repuestoRepository.deleteById(id);
            } catch (IOException e) {
                e.printStackTrace();
            }
        });
    }
}