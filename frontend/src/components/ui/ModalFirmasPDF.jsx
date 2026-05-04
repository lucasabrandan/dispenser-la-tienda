import { useState, useEffect } from 'react';
import FirmaPad from './FirmaPad';
import api from '../../services/api';

// Si el técnico tiene firma guardada, se usa automáticamente sin mostrarse.
// Solo se pide la firma del cliente (siempre nueva).
// onConfirm({ firmaTecnico, firmaCliente })
export default function ModalFirmasPDF({ onConfirm, onCancel }) {
    const [firmaTecnico, setFirmaTecnico]         = useState(null);
    const [firmaCliente, setFirmaCliente]         = useState(null);
    const [editandoTecnico, setEditandoTecnico]   = useState(false);
    const [guardando, setGuardando]               = useState(false);
    const [guardado,  setGuardado]                = useState(false);

    useEffect(() => {
        try {
            const user = JSON.parse(localStorage.getItem('auth_usuario') || '{}');
            if (user.firma) setFirmaTecnico(user.firma);
            else setEditandoTecnico(true); // sin firma guardada → pedir una vez
        } catch {}
    }, []);

    const guardarFirmaTecnico = async () => {
        if (!firmaTecnico) return;
        setGuardando(true);
        try {
            // Persistir en localStorage primero — funciona aunque la API falle
            const user = JSON.parse(localStorage.getItem('auth_usuario') || '{}');
            localStorage.setItem('auth_usuario', JSON.stringify({ ...user, firma: firmaTecnico }));
            setGuardado(true);
            setEditandoTecnico(false);
            setTimeout(() => setGuardado(false), 2000);
            // Intentar sincronizar con el servidor (silencioso si falla)
            if (user.id) {
                api.put(`/admin/usuarios/${user.id}/firma`, { firma: firmaTecnico }).catch(() => {});
            }
        } catch (e) {
            console.error('Error guardando firma', e);
        } finally {
            setGuardando(false);
        }
    };

    const handleConfirm = () => {
        // Guardar silenciosamente si cambió
        try {
            const user = JSON.parse(localStorage.getItem('auth_usuario') || '{}');
            if (user.id && firmaTecnico && firmaTecnico !== user.firma) {
                localStorage.setItem('auth_usuario', JSON.stringify({ ...user, firma: firmaTecnico }));
                api.put(`/admin/usuarios/${user.id}/firma`, { firma: firmaTecnico }).catch(() => {});
            }
        } catch {}
        onConfirm({ firmaTecnico, firmaCliente });
    };

    const firmaGuardada = !!firmaTecnico && !editandoTecnico;

    return (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-lg bg-[#EDEAE6] dark:bg-[#242424] rounded-2xl shadow-2xl overflow-hidden">

                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-[#C0BCB6] dark:border-[#2E2E2E]">
                    <h2 className="font-bold text-[#1C1917] dark:text-[#F0EEE9] text-base">
                        Firma del cliente
                    </h2>
                    <button onClick={onCancel}
                        className="text-[#A8A29E] hover:text-[#D13A28] text-xl font-bold leading-none transition-colors">
                        ×
                    </button>
                </div>

                <div className="p-5 flex flex-col gap-4">

                    {/* Firma técnico — compacta si ya está guardada */}
                    {firmaGuardada ? (
                        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#D8D4CE] dark:bg-[#1C1C1C]">
                            <span className="text-[12px] font-bold text-[var(--success-tx)]">✓ Firma técnico guardada</span>
                            <button
                                onClick={() => setEditandoTecnico(true)}
                                className="ml-auto text-[11px] text-[#A8A29E] hover:text-[#D13A28] transition-colors font-medium"
                            >
                                Cambiar
                            </button>
                        </div>
                    ) : (
                        <div>
                            <FirmaPad
                                label="Firma del técnico"
                                value={firmaTecnico}
                                onChange={val => { setFirmaTecnico(val); setGuardado(false); }}
                                height={100}
                            />
                            <div className="flex items-center gap-2 mt-1">
                                <button
                                    type="button"
                                    onClick={guardarFirmaTecnico}
                                    disabled={!firmaTecnico || guardando}
                                    className="text-[11px] px-3 py-1 rounded-full bg-[#D13A28] text-white font-semibold disabled:opacity-40 transition-colors"
                                >
                                    {guardando ? 'Guardando…' : 'Guardar mi firma'}
                                </button>
                                {guardado && (
                                    <span className="text-[11px] text-[var(--success-tx)] font-semibold">✓ Guardada</span>
                                )}
                                <span className="text-[10px] text-[#A8A29E] ml-auto">Se usará automáticamente</span>
                            </div>
                        </div>
                    )}

                    {/* Firma cliente — siempre visible, espacio grande */}
                    <FirmaPad
                        label="Firma del cliente"
                        value={firmaCliente}
                        onChange={setFirmaCliente}
                        height={firmaGuardada ? 160 : 120}
                    />

                    {/* Botones */}
                    <div className="flex gap-3 pt-1">
                        <button
                            type="button"
                            onClick={onCancel}
                            className="flex-1 py-2.5 rounded-xl border border-[#C0BCB6] dark:border-[#2E2E2E] text-sm font-semibold text-[#A8A29E] transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            onClick={handleConfirm}
                            className="flex-1 py-2.5 rounded-xl bg-[#D13A28] text-white text-sm font-bold transition-colors active:scale-95"
                        >
                            Generar PDF
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
}
