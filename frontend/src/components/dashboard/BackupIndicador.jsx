import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { LuDatabaseBackup, LuTriangleAlert } from 'react-icons/lu';
import api from '../../services/api';

// Estado del backup diario de la base (2-oct-2026, ver BackupService.java).
// Verde si el último salió bien hace menos de 48 h y se subió a la nube; si no, en rojo.

function hace(fechaIso) {
    if (!fechaIso) return null;
    const h = (Date.now() - new Date(fechaIso).getTime()) / 3_600_000;
    if (h < 1) return 'hace menos de 1 h';
    if (h < 48) return `hace ${Math.floor(h)} h`;
    return `hace ${Math.floor(h / 24)} días`;
}

export default function BackupIndicador() {
    const [est, setEst] = useState(null);
    const [haciendo, setHaciendo] = useState(false);

    const cargar = useCallback(() => {
        api.get('/admin/backup').then(r => setEst(r.data)).catch(() => setEst({ error: 'No se pudo consultar' }));
    }, []);
    useEffect(() => { cargar(); }, [cargar]);

    const ahora = async () => {
        setHaciendo(true);
        const t = toast.loading('Haciendo backup…');
        try {
            const r = await api.post('/admin/backup/ahora');
            setEst(r.data);
            if (r.data.ok) toast.success(r.data.nube ? 'Backup hecho y subido a la nube' : 'Backup local hecho (no se subió a la nube)', { id: t });
            else toast.error(`Falló el backup: ${r.data.error || ''}`, { id: t, duration: 8000 });
        } catch {
            toast.error('No se pudo hacer el backup', { id: t });
        } finally {
            setHaciendo(false);
        }
    };

    if (!est) return null;
    const fechaOk = est.ok ? est.fecha : est.ultimoOkFecha;
    const horas = fechaOk ? (Date.now() - new Date(fechaOk).getTime()) / 3_600_000 : Infinity;
    const bien = est.ok && est.nube && horas < 48;
    const mb = est.bytes ? `${(est.bytes / 1048576).toFixed(1)} MB` : '';

    return (
        <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-caption ${bien
            ? 'bg-[#DCFCE7] text-[#15803D] dark:bg-[#0F2E1A] dark:text-[#4ADE80]'
            : 'bg-[#FEE2E2] text-[#B91C1C] dark:bg-[#3B1111] dark:text-[#F87171]'}`}>
            {bien ? <LuDatabaseBackup size={15} className="shrink-0" /> : <LuTriangleAlert size={15} className="shrink-0" />}
            <p className="flex-1 min-w-0 font-bold">
                {fechaOk ? `Último backup ${hace(fechaOk)}` : 'Sin backups registrados'}
                {est.ok && mb ? ` · ${mb}` : ''}
                {est.ok && !est.nube ? ' · solo local, no se subió a la nube' : ''}
                {!est.ok && est.error ? ` · último intento falló: ${est.error}` : ''}
            </p>
            <button onClick={ahora} disabled={haciendo || est.corriendo}
                className="shrink-0 text-label font-black uppercase underline disabled:opacity-40">
                {haciendo || est.corriendo ? 'Haciendo…' : 'Hacer ahora'}
            </button>
        </div>
    );
}
