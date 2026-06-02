package com.dispenserlatienda.service.orden;

import com.dispenserlatienda.domain.orden.NotaAgenda;
import com.dispenserlatienda.domain.usuario.Usuario;
import com.dispenserlatienda.dto.orden.NotaAgendaDTO;
import com.dispenserlatienda.repository.orden.NotaAgendaRepository;
import com.dispenserlatienda.repository.usuario.UsuarioRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class NotaAgendaService {

    private final NotaAgendaRepository repo;
    private final UsuarioRepository usuarioRepo;

    public NotaAgendaService(NotaAgendaRepository repo, UsuarioRepository usuarioRepo) {
        this.repo = repo;
        this.usuarioRepo = usuarioRepo;
    }

    public List<NotaAgendaDTO> listarPorTecnico(Long tecnicoId, LocalDate desde, LocalDate hasta) {
        if (desde != null && hasta != null) {
            return repo.findByTecnicoIdAndFechaBetweenOrderByFechaAscHoraEstimadaAsc(tecnicoId, desde, hasta)
                .stream().map(this::toDTO).collect(Collectors.toList());
        }
        return repo.findByTecnicoIdOrderByFechaAscHoraEstimadaAsc(tecnicoId)
            .stream().map(this::toDTO).collect(Collectors.toList());
    }

    @Transactional
    public NotaAgendaDTO crear(NotaAgendaDTO dto) {
        Usuario tecnico = usuarioRepo.findById(dto.tecnicoId())
            .orElseThrow(() -> new IllegalArgumentException("Tecnico no encontrado: " + dto.tecnicoId()));

        NotaAgenda n = new NotaAgenda();
        n.setTecnico(tecnico);
        n.setFecha(dto.fecha());
        n.setHoraEstimada(dto.horaEstimada());
        n.setTitulo(dto.titulo().trim());
        n.setDescripcion(dto.descripcion());
        n.setDireccion(dto.direccion());
        return toDTO(repo.save(n));
    }

    @Transactional
    public NotaAgendaDTO toggleCompletada(Long id) {
        NotaAgenda n = repo.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("Nota no encontrada: " + id));
        n.setCompletada(!n.isCompletada());
        return toDTO(repo.save(n));
    }

    public List<NotaAgendaDTO> listarTodas(LocalDate desde, LocalDate hasta) {
        return repo.findByFechaBetweenOrderByFechaAscHoraEstimadaAsc(desde, hasta)
            .stream().map(this::toDTO).collect(Collectors.toList());
    }

    @Transactional
    public void eliminar(Long id) {
        repo.deleteById(id);
    }

    private NotaAgendaDTO toDTO(NotaAgenda n) {
        return new NotaAgendaDTO(
            n.getId(),
            n.getTecnico().getId(),
            n.getTecnico().getNombre(),
            n.getFecha(),
            n.getHoraEstimada(),
            n.getTitulo(),
            n.getDescripcion(),
            n.getDireccion(),
            n.isCompletada()
        );
    }
}
