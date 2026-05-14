import { useState, useEffect } from 'react';
import { construirUrlFoto } from '../utils/construirUrlFoto';

/**
 * useProductoForm - Custom Hook
 * Maneja cálculos automáticos de precios y ganancias
 *
 * Fórmulas:
 * - Ganancia/u = Costo × % Ganancia
 * - Precio Base = Costo + Ganancia/u
 * - Precio Lista = Precio Base × (1 + % Markup)
 */

const INITIAL_STATE = {
  sku: '',
  nombre: '',
  descripcion: '',
  foto: null,
  fotoUrl: '',
  costo: 0,
  porcentajeGanancia: 25,
  porcentajeMarkup: 15,
  stock: 0,
};

export function useProductoForm(productoEdicion = null) {
  const [formData, setFormData] = useState(productoEdicion || INITIAL_STATE);
  const [errores, setErrores] = useState({});
  const [cargando, setCargando] = useState(false);
  const [previewFoto, setPreviewFoto] = useState(
    productoEdicion?.fotoUrl ? construirUrlFoto(productoEdicion.fotoUrl) : null
  );

  // ← CLAVE: cuando cambia el producto (distinto ID), reinicializar TODO
  useEffect(() => {
    if (productoEdicion) {
      setFormData({ ...INITIAL_STATE, ...productoEdicion, foto: null });
      setPreviewFoto(productoEdicion.fotoUrl ? construirUrlFoto(productoEdicion.fotoUrl) : null);
    } else {
      setFormData(INITIAL_STATE);
      setPreviewFoto(null);
    }
    setErrores({});
  }, [productoEdicion?.id]); // solo dispara cuando cambia el ID

  // ==========================================
  // CÁLCULOS AUTOMÁTICOS
  // ==========================================

  const calcularGanancias = () => {
    const costo = parseFloat(formData.costo) || 0;
    const porcGanancia = parseFloat(formData.porcentajeGanancia) || 0;
    const porcMarkup = parseFloat(formData.porcentajeMarkup) || 0;

    const gananciaUnidad = (costo * porcGanancia) / 100;
    const precioBase = costo + gananciaUnidad;
    const precioLista = precioBase * (1 + porcMarkup / 100);

    return {
      gananciaUnidad: Math.round(gananciaUnidad * 100) / 100,
      precioBase: Math.round(precioBase * 100) / 100,
      precioLista: Math.round(precioLista * 100) / 100
    };
  };

  const calcularGananciaTotal = (cantidad = 1) => {
    const { gananciaUnidad } = calcularGanancias();
    return Math.round(gananciaUnidad * cantidad * 100) / 100;
  };

  // ==========================================
  // MANEJO DE CAMBIOS
  // ==========================================

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });

    if (errores[name]) {
      const nuevoErrors = { ...errores };
      delete nuevoErrors[name];
      setErrores(nuevoErrors);
    }
  };

  const handleFotoChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData({ ...formData, foto: file });

      const reader = new FileReader();
      reader.onload = (event) => {
        setPreviewFoto(event.target?.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // ==========================================
  // VALIDACIÓN
  // ==========================================

  const validarTodo = () => {
    const nuevosErrores = {};

    if (!formData.sku?.trim()) nuevosErrores.sku = 'SKU requerido';
    if (!formData.nombre?.trim()) nuevosErrores.nombre = 'Nombre requerido';
    if (!formData.costo || formData.costo <= 0) nuevosErrores.costo = 'Costo debe ser > 0';

    setErrores(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  };

  // ==========================================
  // RESETEAR
  // ==========================================

  const resetear = () => {
    setFormData(INITIAL_STATE);
    setErrores({});
    setPreviewFoto(null);
  };

  return {
    formData,
    setFormData,
    errores,
    setErrores,
    cargando,
    setCargando,
    previewFoto,
    setPreviewFoto,
    handleChange,
    handleFotoChange,
    validarTodo,
    resetear,
    calcularGanancias,
    calcularGananciaTotal
  };
}