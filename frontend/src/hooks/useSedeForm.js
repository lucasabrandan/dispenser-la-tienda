import { useState } from 'react';

/**
 * useSedeForm - Custom Hook para crear sedes
 * Maneja estado y validación del formulario de sede
 */

const INITIAL_STATE = {
  nombreSede: '',
  calle: '',
  numero: '',
  piso: '',
  depto: '',
  localidad: '',
  provincia: 'Buenos Aires',
  direccion: ''
};

export function useSedeForm() {
  const [formData, setFormData] = useState(INITIAL_STATE);
  const [errores, setErrores] = useState({});
  const [cargando, setCargando] = useState(false);

  // Validar campo específico
  const validarCampo = (nombreCampo, valor) => {
    const nuevosErrores = { ...errores };
    let tieneError = false;

    const camposObligatorios = ['nombreSede', 'calle', 'numero', 'localidad'];

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
  const handleChange = (e) => {
    const { name, value } = e.target;
    const nuevoForm = { ...formData, [name]: value };

    // Auto-generar dirección
    if (['calle', 'numero', 'piso', 'localidad', 'provincia'].includes(name)) {
      const calle = nuevoForm.calle || '';
      const numero = nuevoForm.numero || '';
      const piso = nuevoForm.piso ? `, Piso ${nuevoForm.piso}` : '';
      const localidad = nuevoForm.localidad || '';
      nuevoForm.direccion = `${calle} ${numero}${piso}, ${localidad}`.trim();
    }

    setFormData(nuevoForm);
    validarCampo(name, value);
  };

  // Validar TODO el formulario
  const validarTodo = () => {
    const camposObligatorios = ['nombreSede', 'calle', 'numero', 'localidad'];
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