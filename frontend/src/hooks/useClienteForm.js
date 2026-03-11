import { useState } from 'react';

/**
 * useClienteForm - Custom Hook
 * Maneja toda la lógica del formulario de cliente
 * 
 * VENTAJAS:
 * - Separar lógica del componente visual
 * - Reutilizable en otros componentes
 * - Más fácil de testear
 */

const INITIAL_STATE = {
  clienteTipo: 'PARTICULAR',
  nombre: '',
  cuilDni: '',
  telefono: '',
  email: '',
  notas: '',
  condicionIva: '',
  calle: '',
  numero: '',
  piso: '',
  depto: '',
  localidad: '',
  provincia: 'Buenos Aires',
  direccion: ''
};

export function useClienteForm(nombrePrellenado = '') {
  // Estados
  const [formData, setFormData] = useState({
    ...INITIAL_STATE,
    nombre: nombrePrellenado
  });
  const [errores, setErrores] = useState({});
  const [cargando, setCargando] = useState(false);

  // Validar campo específico
  const validarCampo = (nombreCampo, valor) => {
    const nuevosErrores = { ...errores };
    let tieneError = false;

    const camposObligatorios = [
      'nombre', 'calle', 'numero', 'localidad', 'condicionIva'
    ];

    if (camposObligatorios.includes(nombreCampo) && !valor?.trim()) {
      tieneError = true;
    }

    if (nombreCampo === 'nombre' && valor?.length < 3) {
      tieneError = true;
    }

    if (nombreCampo === 'telefono' && valor && valor.replace(/\D/g, '').length < 10) {
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
    const camposObligatorios = ['nombre', 'calle', 'numero', 'localidad', 'condicionIva'];
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
    setFormData({ ...INITIAL_STATE, nombre: nombrePrellenado });
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