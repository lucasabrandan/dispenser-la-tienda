package com.dispenserlatienda.service.gasto;

import com.dispenserlatienda.domain.Gasto;
import com.dispenserlatienda.dto.gasto.GastoCreateDTO;
import com.dispenserlatienda.dto.gasto.GastoDTO;
import com.dispenserlatienda.repository.GastoRepository;
import com.dispenserlatienda.exception.ResourceNotFoundException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
public class GastoService {
    private final GastoRepository gastoRepository;

    public GastoService(GastoRepository gastoRepository) {
        this.gastoRepository = gastoRepository;
    }

    @Transactional(readOnly = true)
    public Page<GastoDTO> listarTodos(Pageable pageable) {
        return gastoRepository.findAll(pageable)
                .map(this::mapToDTO);
    }

    @Transactional(readOnly = true)
    public GastoDTO buscarPorId(Long id) {
        return gastoRepository.findById(id)
                .map(this::mapToDTO)
                .orElseThrow(() -> new ResourceNotFoundException("Gasto no encontrado con ID: " + id));
    }

    @Transactional(readOnly = true)
    public List<GastoDTO> gastosPorMes(String mes) {
        // Format esperado: "2026-03"
        LocalDate inicioMes = LocalDate.parse(mes + "-01");
        LocalDate finMes = inicioMes.plusMonths(1).minusDays(1);

        return gastoRepository.findByFechaBetween(inicioMes, finMes).stream()
                .map(this::mapToDTO)
                .toList();
    }

    @Transactional
    public GastoDTO crear(GastoCreateDTO dto) {
        Gasto nuevoGasto = new Gasto(
                dto.descripcion(),
                dto.monto(),
                dto.fecha(),
                dto.categoria()
        );
        return mapToDTO(gastoRepository.save(nuevoGasto));
    }

    @Transactional
    public void eliminar(Long id) {
        if (!gastoRepository.existsById(id)) {
            throw new ResourceNotFoundException("Gasto no encontrado con ID: " + id);
        }
        gastoRepository.deleteById(id);
    }

    private GastoDTO mapToDTO(Gasto gasto) {
        return new GastoDTO(
                gasto.getId(),
                gasto.getDescripcion(),
                gasto.getMonto(),
                gasto.getFecha(),
                gasto.getCategoria()
        );
    }
}