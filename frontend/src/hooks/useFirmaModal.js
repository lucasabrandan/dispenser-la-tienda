import { useState, useRef } from 'react';

/**
 * useFirmaModal
 * Expone pedirFirma() — devuelve una Promise que resuelve con:
 *   - string (data URL de PNG) si el cliente firmó
 *   - null si el usuario eligió omitir
 *
 * Ejemplo de uso:
 *   const { firmaVisible, pedirFirma, confirmarFirma, omitirFirma } = useFirmaModal();
 *   const dataUrl = await pedirFirma();  // muestra el modal y espera
 *   // luego: {firmaVisible && <FirmaModal onConfirmar={confirmarFirma} onOmitir={omitirFirma} />}
 */
export function useFirmaModal() {
    const [firmaVisible, setFirmaVisible] = useState(false);
    const resolveRef = useRef(null);

    const pedirFirma = () => new Promise(resolve => {
        resolveRef.current = resolve;
        setFirmaVisible(true);
    });

    const confirmarFirma = (dataUrl) => {
        resolveRef.current?.(dataUrl);
        setFirmaVisible(false);
    };

    const omitirFirma = () => {
        resolveRef.current?.(null);
        setFirmaVisible(false);
    };

    return { firmaVisible, pedirFirma, confirmarFirma, omitirFirma };
}
