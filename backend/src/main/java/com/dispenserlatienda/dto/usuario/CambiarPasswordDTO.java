package com.dispenserlatienda.dto.usuario;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CambiarPasswordDTO(
        @NotBlank @Size(min = 6) String nuevaPassword
) {}
