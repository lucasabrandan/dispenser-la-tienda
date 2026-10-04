import { useCallback } from 'react';
import api from '../services/api';
import { toast } from 'react-hot-toast';

export function useEquipoActions(onRefresh) {
    // ── ARCHIVAR (soft delete) ───────────────────────────────────────────────
    const handleArchivar = useCallback(async (equipo) => {
        const msg = `¿Archivar "${equipo.marca} ${equipo.modelo}"?\n\nS/N: ${equipo.numeroSerie}\nEl historial de servicios se preserva.`;
        
        if (!window.confirm(msg)) return;

        const loading = toast.loading("Archivando equipo...");
        try {
            await api.delete(`/equipos/${equipo.id}`);
            toast.success("✅ Equipo archivado", { id: loading });
            onRefresh();
        } catch (err) {
            const data = err.response?.data;
            const errMsg = typeof data === 'string' ? data : data?.message || data?.mensaje || "Error al archivar";
            toast.error(errMsg, { id: loading });
        }
    }, [onRefresh]);

    // ── RESTAURAR (reactivar) ───────────────────────────────────────────────
    const handleRestaurar = useCallback(async (equipo) => {
        const msg = `¿Restaurar "${equipo.marca} ${equipo.modelo}"?\n\nS/N: ${equipo.numeroSerie}`;
        
        if (!window.confirm(msg)) return;

        const loading = toast.loading("Restaurando equipo...");
        try {
            await api.patch(`/equipos/${equipo.id}/restaurar`);
            toast.success("✅ Equipo restaurado", { id: loading });
            onRefresh();
        } catch (err) {
            const data = err.response?.data;
            const errMsg = typeof data === 'string' ? data : data?.message || data?.mensaje || "Error al restaurar";
            toast.error(errMsg, { id: loading });
        }
    }, [onRefresh]);

    // ── ELIMINAR DEFINITIVO (hard delete) ─────────────────────────────────
    const handleEliminarDefinitivo = useCallback(async (equipo, { yaConfirmado = false } = {}) => {
        // Bug 5-oct-2026: llegaba el id en vez del equipo → DELETE /equipos/undefined/definitivo
        if (!equipo || equipo.id == null) { toast.error('No se encontró el equipo'); return; }
        const advertencia = `⚠️ ELIMINACIÓN DEFINITIVA\n\n` +
            `Equipo: ${equipo.marca} ${equipo.modelo}\n` +
            `S/N: ${equipo.numeroSerie}\n` +
            `\nSe borrará TODO el historial de servicios asociado.\nEsta acción NO se puede deshacer.\n\n¿Confirmás?`;

        // Si ya se confirmó en pantalla, no se piden los confirm del navegador
        // (en la app instalada en el celu no aparecen y frenaban todo)
        if (!yaConfirmado && !window.confirm(advertencia)) return;
        if (!yaConfirmado && !window.confirm(`Segunda confirmación: ¿Borrar "${equipo.marca} ${equipo.modelo}" y TODO su historial definitivamente?`)) return;

        const loading = toast.loading("Eliminando definitivamente...");
        try {
            await api.delete(`/equipos/${equipo.id}/definitivo`);
            toast.success("✅ Equipo eliminado definitivamente", { id: loading });
            onRefresh();
        } catch (err) {
            const data = err.response?.data;
            const errMsg = typeof data === 'string' ? data : data?.message || data?.mensaje || "Error al eliminar";
            toast.error(errMsg, { id: loading, duration: 5000 });
        }
    }, [onRefresh]);

    return { handleArchivar, handleRestaurar, handleEliminarDefinitivo };
}