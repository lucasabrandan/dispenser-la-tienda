/**
 * Migración única: aplica Title Case a todos los clientes existentes en la DB.
 * Ejecutar desde la consola del browser: import('/src/utils/migrarTitleCase.js')
 * O llamar migrarClientesTitleCase() desde un botón temporal.
 */
import api from '../services/api';
import { toTitleCase } from './titleCase';

export async function migrarClientesTitleCase() {
    console.log('Iniciando migración Title Case...');
    try {
        const res = await api.get('/clientes?page=0&size=500');
        const clientes = res.data.content || res.data || [];
        console.log(`${clientes.length} clientes encontrados`);

        let actualizados = 0;
        for (const c of clientes) {
            const nombreNuevo = toTitleCase(c.nombre);
            const calleNueva = toTitleCase(c.calle);
            const localidadNueva = toTitleCase(c.localidad);

            // Solo actualizar si cambió algo
            if (nombreNuevo !== c.nombre || calleNueva !== c.calle || localidadNueva !== c.localidad) {
                try {
                    await api.put(`/clientes/${c.id}`, {
                        ...c,
                        nombre: nombreNuevo,
                        calle: calleNueva || 'Sin dirección',
                        numero: c.numero || '0',
                        localidad: localidadNueva || 'Sin localidad',
                        provincia: c.provincia || 'Buenos Aires',
                        clienteTipo: c.clienteTipo || 'PARTICULAR',
                        condicionIva: c.condicionIva || 'CONSUMIDOR_FINAL',
                    });
                    console.log(`✓ ${c.nombre} → ${nombreNuevo}`);
                    actualizados++;
                } catch (e) {
                    console.error(`✗ Error con ${c.nombre}:`, e.response?.data || e.message);
                }
            }
        }
        console.log(`Migración completa: ${actualizados}/${clientes.length} actualizados`);
        return { total: clientes.length, actualizados };
    } catch (e) {
        console.error('Error en migración:', e);
        throw e;
    }
}
