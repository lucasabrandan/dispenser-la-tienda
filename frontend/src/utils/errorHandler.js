// Extrae mensaje de error legible desde respuesta de API o excepcion
export function getErrorMessage(err, fallback = 'Error inesperado') {
    if (err?.response?.data?.detalles?.camposInvalidos) {
        return Object.values(err.response.data.detalles.camposInvalidos).join(', ');
    }
    return err?.response?.data?.mensaje || err?.message || fallback;
}
