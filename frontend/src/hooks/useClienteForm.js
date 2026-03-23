import { useState } from 'react';

const INITIAL_STATE = {
  clienteTipo:  'PARTICULAR',
  nombre:       '',
  cuilDni:      '',
  telefono:     '',
  email:        '',
  notas:        '',
  condicionIva: 'CONSUMIDOR_FINAL',
  calle:        '',
  numero:       '',
  piso:         '',
  depto:        '',
  localidad:    '',
  provincia:    'Buenos Aires',
  direccion:    ''
};

/**
 * useClienteForm
 * modoFlota = false → solo nombre obligatorio (cliente ocasional)
 * modoFlota = true  → nombre + dirección + condiciónIVA obligatorios
 */
export function useClienteForm(nombrePrellenado = '', modoFlota = false) {
  const [formData, setFormData] = useState({ ...INITIAL_STATE, nombre: nombrePrellenado });
  const [errores,  setErrores]  = useState({});
  const [cargando, setCargando] = useState(false);

  const camposObligatoriosFlota = ['nombre', 'calle', 'numero', 'localidad', 'condicionIva'];
  const camposObligatoriosRapido = ['nombre'];

  const camposObligatorios = modoFlota ? camposObligatoriosFlota : camposObligatoriosRapido;

  const validarCampo = (campo, valor) => {
    const nuevosErrores = { ...errores };
    const esObligatorio = camposObligatorios.includes(campo);

    if (esObligatorio && (!valor?.trim() || (campo === 'nombre' && valor.trim().length < 2))) {
      nuevosErrores[campo] = true;
    } else {
      delete nuevosErrores[campo];
    }

    setErrores(nuevosErrores);
    return !nuevosErrores[campo];
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    const nuevoForm = { ...formData, [name]: value };

    if (['calle', 'numero', 'piso', 'localidad', 'provincia'].includes(name)) {
      const calle    = nuevoForm.calle    || '';
      const numero   = nuevoForm.numero   || '';
      const piso     = nuevoForm.piso ? `, Piso ${nuevoForm.piso}` : '';
      const localidad = nuevoForm.localidad || '';
      nuevoForm.direccion = `${calle} ${numero}${piso}, ${localidad}`.trim();
    }

    setFormData(nuevoForm);
    validarCampo(name, value);
  };

  const validarTodo = () => {
    const nuevosErrores = {};
    camposObligatorios.forEach(campo => {
      const val = formData[campo];
      if (!val || val.toString().trim() === '') {
        nuevosErrores[campo] = true;
      }
    });
    if (formData.nombre && formData.nombre.trim().length < 2) {
      nuevosErrores.nombre = true;
    }
    setErrores(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  };

  const resetear = () => {
    setFormData({ ...INITIAL_STATE, nombre: nombrePrellenado });
    setErrores({});
  };

  return {
    formData, errores, cargando,
    handleChange, validarTodo, resetear,
    setFormData, setErrores, setCargando
  };
}