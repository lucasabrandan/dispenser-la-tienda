/**
 * Convierte un string a Title Case: primera letra de cada palabra en mayúscula.
 * "walter copper steel" → "Walter Copper Steel"
 * "JUAN GARCIA" → "Juan Garcia"
 * Respeta siglas de 2-3 letras en mayúscula: "SA", "SRL"
 */
export function toTitleCase(str) {
    if (!str) return str;
    const siglas = ['SA', 'SRL', 'SAS', 'SE', 'CABA', 'RRHH', 'II', 'III', 'IV'];
    return str.trim().split(/\s+/).map(word => {
        const upper = word.toUpperCase();
        if (siglas.includes(upper)) return upper;
        if (word.length <= 2 && /^[A-Z]+$/.test(word)) return word; // ya es sigla
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    }).join(' ');
}
