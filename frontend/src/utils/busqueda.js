// Búsqueda multi-término para los selects (react-select).
// "ma nicolas" o "ma+nicolas" encuentra "Ma3077 - Nicolas": cada palabra tiene que
// aparecer en el texto de la opción, sin importar mayúsculas ni acentos.

export const normalizar = (txt) =>
    String(txt ?? '')
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase();

export const terminos = (input) =>
    normalizar(input).split(/[\s+]+/).filter(Boolean);

export const coincideTodo = (texto, input) => {
    const t = terminos(input);
    if (t.length === 0) return true;
    const base = normalizar(texto);
    return t.every(term => base.includes(term));
};

// Para usar como filterOption={filtroMultiTermino}
export const filtroMultiTermino = (option, input) => {
    // La opción "Crear ..." de CreatableSelect siempre tiene que verse
    if (option?.data?.__isNew__) return true;
    return coincideTodo(`${option?.label ?? ''} ${option?.value ?? ''}`, input);
};
