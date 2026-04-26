import { useState, useEffect } from 'react';
import FirmaPad from './FirmaPad';
import api from '../../services/api';

// Modal que se muestra antes de generar cualquier PDF con firmas.
// - Técnico: carga firma guardada automáticamente, se puede editar y guardar.
// - Cliente: siempre en blanco.
// onConfirm({ firmaTecnico, firmaCliente })
export default function ModalFirmasPDF({ onConfirm, onCancel }) {
    const [firmaTecnico, setFirmaTecnico] = useState(null);
    const [firmaCliente, setFirmaCliente] = useState(null);
    const [guardando,    setGuardando]    = useState(false);
    const [guardado,     setGuardado]     = useState(false);

    // Carga firma guardada del técnico logueado
    useEffect(() => {
        try {
            const user = JSON.parse(localStorage.getItem('auth_usuario') || '{}');
            if (user.firma) setFirmaTecnico(user.firma);
        } catch {}
    }, []);

    const guardarFirmaTecnico = async () => {
        if (!firmaTecnico) return;
        try {
            setGuardando(true);
            const user = JSON.parse(localStorage.getItem('auth_usuario') || '{}');
            await api.put(`/admin/usuarios/${user.id}/firma`, { firma: firmaTecnico });
            // Actualiza localStorage para próximas sesiones
            localStorage.setItem('auth_usuario', JSON.stringify({ ...user, firma: firmaTecnico }));
            setGuardado(true);
            setTimeout(() => setGuardado(false), 2000);
        } catch (e) {
            console.error('Error guardando firma', e);
        } finally {
            setGuardando(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-lg bg-[#EDEAE6] dark:bg-[#242424] rounded-2xl shadow-2xl overflow-hidden">

                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-[#C0BCB6] dark:border-[#2E2E2E]">
                    <h2 className="font-bold text-[#1C1917] dark:text-[#F0EEE9] text-base">
                        Firmas del documento
                    </h2>
                    <button onClick={onCancel}
                        className="text-[#A8A29E] hover:text-[#D13A28] text-xl font-bold leading-none transition-colors">
                        ×
                    </button>
                </div>

                <div className="p-5 flex flex-col gap-5">

                    {/* Firma técnico */}
                    <div>
                        <FirmaPad
                            label="Firma del técnico"
                            value={firmaTecnico}
                            onChange={val => { setFirmaTecnico(val); setGuardado(false); }}
                        />
                        <div className="flex items-center gap-2 mt-1">
                            <button
                                type="button"
                                onClick={guardarFirmaTecnico}
                                disabled={!firmaTecnico || guardando}
                                className="text-[11px] px-3 py-1 rounded-full bg-[#D13A28] text-white font-semibold disabled:opacity-40 hover:bg-[#b52f20] transition-colors"
                            >
                                {guardando ? 'Guardando…' : 'Guardar como mi firma'}
                            </button>
                            {guardado && (
                                <span className="text-[11px] text-green-600 dark:text-green-400 font-semibold">
                                    ✓ Guardada
                                </span>
                            )}
                            <span className="text-[10px] text-[#A8A29E] ml-auto">
                                Se usará automáticamente la próxima vez
                            </span>
                        </div>
                    </div>

                    {/* Firma cliente */}
                    <div>
                        <FirmaPad
                            label="Firma del cliente"
                            value={firmaCliente}
                            onChange={setFirmaCliente}
                        />
                    </div>

                    {/* Botones */}
                    <div className="flex gap-3 pt-1">
                        <button
                            type="button"
                            onClick={onCancel}
                            className="flex-1 py-2.5 rounded-xl border border-[#C0BCB6] dark:border-[#2E2E2E] text-sm font-semibold text-[#A8A29E] hover:text-[#1C1917] dark:hover:text-[#F0EEE9] transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            onClick={() => onConfirm({ firmaTecnico, firmaCliente })}
                            className="flex-1 py-2.5 rounded-xl bg-[#D13A28] text-white text-sm font-bold hover:bg-[#b52f20] transition-colors"
                        >
                            Generar PDF
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
}
