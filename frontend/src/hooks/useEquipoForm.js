import { useState } from 'react';

/**
 * useEquipoForm - Custom Hook
 * Maneja estado y validación del formulario de equipo
 */

const INITIAL_STATE = {
  numeroSerie: '',
  marca: '',
  modelo: '',
  tipoDispenser: 'AGUA',
  anioFabricacion: new Date().getFullYear().toString(),
  notas: ''
};

export function useEquipoForm() {
  const [formData, setFormData] = useState(INITIAL_STATE);
  const [errores, setErrores] = useState({});
  const [cargando, setCargando] = useState(false);

  // Validar campo específico
  const validarCampo = (nombreCampo, valor) => {
    const nuevosErrores = { ...errores };
    let tieneError = false;

    const camposObligatorios = ['numeroSerie', 'marca', 'modelo'];

    if (camposObligatorios.includes(nombreCampo) && !valor?.trim()) {
      tieneError = true;
    }

    if (tieneError) {
      nuevosErrores[nombreCampo] = true;
    } else {
      delete nuevosErrores[nombreCampo];
    }

    setErrores(nuevosErrores);
    return !tieneError;
  };

  // Cambio en campo
  const handleChange = e => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    validarCampo(name, value);
  };

  // Validar TODO el formulario
  const validarTodo = () => {
    const camposObligatorios = ['numeroSerie', 'marca', 'modelo'];
    const nuevosErrores = {};
    let tieneErrores = false;

    camposObligatorios.forEach(campo => {
      if (!formData[campo] || formData[campo].toString().trim() === '') {
        nuevosErrores[campo] = true;
        tieneErrores = true;
      }
    });

    setErrores(nuevosErrores);
    return !tieneErrores;
  };

  // Resetear formulario
  const resetear = () => {
    setFormData(INITIAL_STATE);
    setErrores({});
  };

  return {
    formData,
    errores,
    cargando,
    handleChange,
    validarTodo,
    resetear,
    setFormData,
    setErrores,
    setCargando
  };
}