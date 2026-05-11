package com.dispenserlatienda.service.radar;

import com.dispenserlatienda.dto.radar.RadarAlertaDTO;
import com.dispenserlatienda.repository.servicio.RadarEquipoProjection;
import com.dispenserlatienda.repository.servicio.ServicioItemRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

@Service
public class RadarService {

    private static final int MESES_FILTRO       = 11;
    private static final int MESES_SANITIZACION =  5;

    private final ServicioItemRepository repo;

    public RadarService(ServicioItemRepository repo) {
        this.repo = repo;
    }

    public List<RadarAlertaDTO> generarAlertas() {
        List<RadarEquipoProjection> datos = repo.findRadarData();
        LocalDate hoy = LocalDate.now();
        List<RadarAlertaDTO> alertas = new ArrayList<>();

        for (RadarEquipoProjection d : datos) {
            LocalDate ultimoServicio = d.getUltimoServicio();
            LocalDate ultimoFiltro   = d.getUltimoFiltro();

            long mesesServicio = ChronoUnit.MONTHS.between(ultimoServicio, hoy);
            long mesesFiltro   = ultimoFiltro != null
                    ? ChronoUnit.MONTHS.between(ultimoFiltro, hoy)
                    : mesesServicio;

            String tipoAlerta = null;
            int    meses      = 0;

            if (mesesFiltro >= MESES_FILTRO) {
                tipoAlerta = "FILTRO";
                meses      = (int) mesesFiltro;
            } else if (mesesServicio >= MESES_SANITIZACION) {
                tipoAlerta = "SANITIZACION";
                meses      = (int) mesesServicio;
            }

            if (tipoAlerta != null) {
                RadarAlertaDTO dto = new RadarAlertaDTO();
                dto.setSerial(d.getSerial());
                dto.setClienteNombre(d.getClienteNombre());
                dto.setSedeNombre(d.getSedeNombre());
                dto.setClienteTelefono(d.getClienteTelefono());
                dto.setFechaUltimoServicio(ultimoServicio);
                dto.setFechaUltimoFiltro(ultimoFiltro);
                dto.setTipoAlerta(tipoAlerta);
                dto.setMeses(meses);
                alertas.add(dto);
            }
        }

        alertas.sort(Comparator.comparingInt(RadarAlertaDTO::getMeses).reversed());
        return alertas;
    }
}
