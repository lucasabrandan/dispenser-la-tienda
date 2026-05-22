import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { getUsuarios, crearUsuario, editarUsuario, cambiarPassword, eliminarUsuario } from '../../services/api';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const ROL_LABEL = { ADMIN: 'Administrador', TECNICO: 'Técnico' };
const ROL_COLOR = {
    ADMIN:   'bg-[#D13A28]/10 text-[#D13A28] dark:bg-[#E8422F]/10 dark:text-[#E8422F]',
    TECNICO: 'bg-[#D48800]/10 text-[#D48800] dark:bg-[#F0A500]/10 dark:text-[#F0A500]',
};

const FORM_VACIO = { nombre: '', username: '', password: '', passwordConfirm: '', rol: 'TECNICO', telefono: '', whatsapp: '' };

export default function UsuariosManager() {
    const { usuario: usuarioActual } = useAuth();
    const [usuarios, setUsuarios]     = useState([]);
    const [cargando, setCargando]     = useState(true);
    const [filtroRol, setFiltroRol]   = useState('TODOS');
    const [confirmEliminar, setConfirmEliminar] = useState(null); // null | usuario

    // Configuracion de empresa (solo en localStorage, solo ADMIN)
    const CONDICIONES_DEFAULT = 'Garantia 90 dias mano de obra  ·  Repuestos segun fabricante  ·  El servicio se coordina una vez aprobado';
    const [condicionesPDF, setCondicionesPDF] = useState(() => localStorage.getItem('empresa_condiciones_pdf') || CONDICIONES_DEFAULT);
    const [condGuardado, setCondGuardado] = useState(false);

    // Configuracion global de pricing
    const [configGlobal, setConfigGlobal] = useState(null);
    const [configGuardado, setConfigGuardado] = useState(false);

    useEffect(() => {
        if (usuarioActual?.rol === 'ADMIN') {
            api.get('/configuracion').then(r => setConfigGlobal(r.data)).catch(() => {});
        }
    }, [usuarioActual?.rol]);

    const guardarCondiciones = () => {
        localStorage.setItem('empresa_condiciones_pdf', condicionesPDF.trim() || CONDICIONES_DEFAULT);
        setCondGuardado(true);
        toast.success('Condiciones guardadas');
        setTimeout(() => setCondGuardado(false), 2000);
    };

    const guardarConfig = async () => {
        try {
            const res = await api.put('/configuracion', configGlobal);
            setConfigGlobal(res.data);
            setConfigGuardado(true);
            toast.success('Configuracion guardada');
            setTimeout(() => setConfigGuardado(false), 2000);
        } catch { toast.error('Error al guardar'); }
    };

    // Modal crear/editar
    const [modal, setModal]           = useState(null); // null | 'crear' | usuario
    const [form, setForm]             = useState(FORM_VACIO);
    const [guardando, setGuardando]   = useState(false);

    // Modal cambiar clave
    const [modalPass, setModalPass]   = useState(null); // null | usuario
    const [nuevaClave, setNuevaClave] = useState('');

    // Visibilidad de claves
    const [verClave, setVerClave]           = useState(false);
    const [verClaveConfirm, setVerClaveConfirm] = useState(false);
    const [verNuevaClave, setVerNuevaClave] = useState(false);

    const cargar = async () => {
        setCargando(true);
        try {
            const r = await getUsuarios();
            setUsuarios(r.data);
        } catch { toast.error('Error al cargar usuarios'); }
        finally { setCargando(false); }
    };

    useEffect(() => { cargar(); }, []);

    const abrirCrear = () => { setForm(FORM_VACIO); setModal('crear'); setVerClave(false); setVerClaveConfirm(false); };
    const abrirEditar = (u) => {
        setForm({ nombre: u.nombre, username: u.username, password: '', rol: u.rol, telefono: u.telefono || '', whatsapp: u.whatsapp || '' });
        setModal(u);
    };

    const guardar = async () => {
        if (!form.nombre.trim() || !form.username.trim()) {
            toast.error('Nombre y usuario son obligatorios'); return;
        }
        if (modal === 'crear' && !form.password.trim()) {
            toast.error('La contraseña es obligatoria'); return;
        }
        if (modal === 'crear' && form.password.length < 6) {
            toast.error('Mínimo 6 caracteres'); return;
        }
        if (modal === 'crear' && form.password !== form.passwordConfirm) {
            toast.error('Las contraseñas no coinciden'); return;
        }
        setGuardando(true);
        try {
            if (modal === 'crear') {
                await crearUsuario({ nombre: form.nombre, username: form.username, password: form.password, rol: form.rol, telefono: form.telefono || null, whatsapp: form.whatsapp || null });
                toast.success('Usuario creado');
            } else {
                await editarUsuario(modal.id, { nombre: form.nombre, rol: form.rol, activo: modal.activo, telefono: form.telefono || null, whatsapp: form.whatsapp || null });
                toast.success('Usuario actualizado');
            }
            setModal(null);
            cargar();
        } catch (e) {
            toast.error(e.response?.status === 409 ? 'El usuario ya existe' : 'Error al guardar');
        } finally { setGuardando(false); }
    };

    const toggleActivo = async (u) => {
        try {
            await editarUsuario(u.id, { nombre: u.nombre, rol: u.rol, activo: !u.activo, telefono: u.telefono || null, whatsapp: u.whatsapp || null });
            toast.success(u.activo ? 'Usuario desactivado' : 'Usuario activado');
            cargar();
        } catch { toast.error('Error al actualizar'); }
    };

    const eliminar = async () => {
        try {
            await eliminarUsuario(confirmEliminar.id);
            toast.success('Usuario eliminado');
            setConfirmEliminar(null);
            cargar();
        } catch (e) {
            const msg = e.response?.data?.mensaje || 'Error al eliminar';
            toast.error(msg);
            setConfirmEliminar(null);
        }
    };

    const guardarClave = async () => {
        if (!nuevaClave || nuevaClave.length < 6) {
            toast.error('Mínimo 6 caracteres'); return;
        }
        try {
            await cambiarPassword(modalPass.id, { nuevaPassword: nuevaClave });
            toast.success('Contraseña cambiada');
            setModalPass(null); setNuevaClave('');
        } catch { toast.error('Error al cambiar contraseña'); }
    };

    const usuariosFiltrados = filtroRol === 'TODOS'
        ? usuarios
        : usuarios.filter(u => u.rol === filtroRol);

    return (
        <div className="min-h-screen pb-28 md:pb-8 font-sans bg-[#F5F3F1] dark:bg-[#141414] transition-colors">

            {/* HEADER */}
            <div className="px-4 md:px-0 pt-5 md:pt-0 pb-4 flex justify-between items-end">
                <div>
                    <h2 className="text-[28px] font-black uppercase tracking-tighter leading-none text-[#1C1917] dark:text-[#F0EEE9]">
                        Usuarios
                    </h2>
                    <p className="text-[11px] font-medium mt-1 text-[#A8A29E]">Gestión de accesos y permisos</p>
                </div>
                <button
                    onClick={abrirCrear}
                    className="h-10 px-5 rounded-xl font-bold text-xs text-white uppercase transition-all active:scale-95 hover:opacity-90 bg-[#D13A28] dark:bg-[#E8422F]"
                >
                    + Nuevo
                </button>
            </div>

            <div className="px-4 md:px-0 space-y-3">

                {/* STATS */}
                <div className="grid grid-cols-3 gap-3">
                    {['TODOS', 'ADMIN', 'TECNICO'].map(rol => (
                        <button
                            key={rol}
                            onClick={() => setFiltroRol(rol)}
                            className={`rounded-2xl p-3 text-center border transition-all active:scale-95 ${
                                filtroRol === rol
                                    ? 'bg-[#D13A28] dark:bg-[#E8422F] border-transparent text-white'
                                    : 'bg-[#FFFFFF] dark:bg-[#242424] border-black/[0.07] dark:border-white/[0.07] text-[#57534E] dark:text-[#A8A29E]'
                            }`}
                        >
                            <p className="text-[18px] font-black leading-none">
                                {rol === 'TODOS' ? usuarios.length : usuarios.filter(u => u.rol === rol).length}
                            </p>
                            <p className="text-[9px] font-bold uppercase tracking-wider mt-1">
                                {rol === 'TODOS' ? 'Total' : ROL_LABEL[rol]}
                            </p>
                        </button>
                    ))}
                </div>

                {/* CONFIGURACIÓN DE EMPRESA — solo ADMIN */}
                {usuarioActual?.rol === 'ADMIN' && (
                    <div className="rounded-2xl bg-[#FFFFFF] dark:bg-[#242424] border border-black/[0.07] dark:border-white/[0.07] p-4 space-y-3">
                        <p className="text-[11px] font-bold text-[#A8A29E] uppercase tracking-wider">Configuración de empresa</p>
                        <div>
                            <label className="text-[10px] font-bold text-[#A8A29E] uppercase tracking-wider">
                                Condiciones del presupuesto (texto que aparece al pie del PDF)
                            </label>
                            <div className="mt-1 flex gap-2">
                                <textarea
                                    className="flex-1 h-16 px-3 py-2 rounded-xl text-[12px] bg-[#EFEDEA] dark:bg-[#2E2E2E] text-[#1C1917] dark:text-[#F0EEE9] border border-black/[0.08] dark:border-white/[0.08] outline-none resize-none"
                                    value={condicionesPDF}
                                    onChange={e => setCondicionesPDF(e.target.value)}
                                    placeholder="Garantía 90 días mano de obra · Repuestos según fabricante..."
                                />
                                <button
                                    onClick={guardarCondiciones}
                                    className={`h-10 px-4 rounded-xl font-bold text-xs text-white transition-all active:scale-95 self-start ${
                                        condGuardado ? 'bg-[#16a34a]' : 'bg-[#D13A28] dark:bg-[#E8422F] hover:opacity-90'
                                    }`}
                                >
                                    {condGuardado ? '✓' : 'Guardar'}
                                </button>
                            </div>
                            <p className="text-[10px] text-[#A8A29E] mt-1">
                                Se muestra en presupuestos y órdenes de servicio.
                            </p>
                        </div>
                    </div>
                )}

                {/* LISTA */}
                {cargando ? (
                    <div className="text-center py-16 font-bold text-[#A8A29E]">Cargando...</div>
                ) : usuariosFiltrados.length === 0 ? (
                    <div className="text-center py-16 rounded-2xl bg-[#FFFFFF] dark:bg-[#242424] text-[#A8A29E] font-bold">
                        Sin usuarios en esta categoría
                    </div>
                ) : (
                    <div className="flex flex-col gap-3">
                        {usuariosFiltrados.map(u => (
                            <div key={u.id}
                                 className={`rounded-2xl bg-[#FFFFFF] dark:bg-[#242424] overflow-hidden border ${
                                     u.activo
                                         ? 'border-black/[0.07] dark:border-white/[0.07]'
                                         : 'border-dashed border-black/[0.15] dark:border-white/[0.15] opacity-60'
                                 }`}>
                                <div className="p-4 flex items-center justify-between gap-3">
                                    {/* Avatar */}
                                    <div className="w-10 h-10 rounded-xl bg-[#D13A28]/10 dark:bg-[#E8422F]/10 flex items-center justify-center text-[18px] shrink-0">
                                        {u.rol === 'ADMIN' ? '🛡️' : '🔧'}
                                    </div>
                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <p className="font-black text-[14px] text-[#1C1917] dark:text-[#F0EEE9]">{u.nombre}</p>
                                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md uppercase ${ROL_COLOR[u.rol]}`}>
                                                {ROL_LABEL[u.rol]}
                                            </span>
                                            {!u.activo && (
                                                <span className="text-[9px] font-bold px-2 py-0.5 rounded-md uppercase bg-[#A8A29E]/20 text-[#A8A29E]">
                                                    Inactivo
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-[11px] text-[#A8A29E] mt-0.5">@{u.username}{u.telefono ? `  ·  ${u.telefono}` : ''}</p>
                                    </div>
                                    {/* Acciones */}
                                    <div className="flex gap-2 shrink-0">
                                        <button
                                            onClick={() => { setModalPass(u); setNuevaClave(''); }}
                                            title="Cambiar contraseña"
                                            className="w-9 h-9 rounded-xl flex items-center justify-center text-sm bg-[#EFEDEA] dark:bg-[#2E2E2E] active:scale-90 transition-all"
                                        >🔑</button>
                                        <button
                                            onClick={() => abrirEditar(u)}
                                            title="Editar"
                                            className="w-9 h-9 rounded-xl flex items-center justify-center text-sm bg-[#EFEDEA] dark:bg-[#2E2E2E] active:scale-90 transition-all"
                                        >✏️</button>
                                        <button
                                            onClick={() => toggleActivo(u)}
                                            title={u.activo ? 'Desactivar' : 'Activar'}
                                            className="w-9 h-9 rounded-xl flex items-center justify-center text-sm bg-[#EFEDEA] dark:bg-[#2E2E2E] active:scale-90 transition-all"
                                        >{u.activo ? '🔒' : '✅'}</button>
                                        {usuarioActual?.id !== u.id && (
                                            <button
                                                onClick={() => setConfirmEliminar(u)}
                                                title="Eliminar"
                                                className="w-9 h-9 rounded-xl flex items-center justify-center text-sm bg-[#D13A28]/10 dark:bg-[#E8422F]/10 active:scale-90 transition-all"
                                            >🗑️</button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* MODAL CREAR / EDITAR */}
            {modal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="w-full max-w-sm rounded-3xl p-6 bg-[#FFFFFF] dark:bg-[#242424] shadow-2xl space-y-4">
                        <h3 className="text-[16px] font-black text-[#1C1917] dark:text-[#F0EEE9]">
                            {modal === 'crear' ? 'Nuevo usuario' : `Editar: ${modal.nombre}`}
                        </h3>

                        <div className="space-y-3">
                            <div>
                                <label className="text-[10px] font-bold text-[#A8A29E] uppercase tracking-wider">Nombre completo</label>
                                <input
                                    className="mt-1 w-full h-10 px-3 rounded-xl text-[13px] font-bold bg-[#EFEDEA] dark:bg-[#2E2E2E] text-[#1C1917] dark:text-[#F0EEE9] border border-black/[0.08] dark:border-white/[0.08] outline-none"
                                    value={form.nombre}
                                    onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                                    placeholder="Ej: Juan Pérez"
                                />
                            </div>
                            {modal === 'crear' && (
                                <>
                                    <div>
                                        <label className="text-[10px] font-bold text-[#A8A29E] uppercase tracking-wider">Usuario (login)</label>
                                        <input
                                            className="mt-1 w-full h-10 px-3 rounded-xl text-[13px] font-bold bg-[#EFEDEA] dark:bg-[#2E2E2E] text-[#1C1917] dark:text-[#F0EEE9] border border-black/[0.08] dark:border-white/[0.08] outline-none"
                                            value={form.username}
                                            onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                                            placeholder="Ej: juan"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-[#A8A29E] uppercase tracking-wider">Contraseña</label>
                                        <div className="relative mt-1">
                                            <input
                                                type={verClave ? 'text' : 'password'}
                                                className="w-full h-10 px-3 pr-9 rounded-xl text-[13px] font-bold bg-[#EFEDEA] dark:bg-[#2E2E2E] text-[#1C1917] dark:text-[#F0EEE9] border border-black/[0.08] dark:border-white/[0.08] outline-none"
                                                value={form.password}
                                                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                                                placeholder="Mínimo 6 caracteres"
                                            />
                                            <button type="button" onClick={() => setVerClave(v => !v)} tabIndex={-1}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 text-[#A8A29E] text-xs">
                                                {verClave ? '🙈' : '👁️'}
                                            </button>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-[#A8A29E] uppercase tracking-wider">Confirmar contraseña</label>
                                        <div className="relative mt-1">
                                            <input
                                                type={verClaveConfirm ? 'text' : 'password'}
                                                className={`w-full h-10 px-3 pr-9 rounded-xl text-[13px] font-bold bg-[#EFEDEA] dark:bg-[#2E2E2E] text-[#1C1917] dark:text-[#F0EEE9] outline-none border ${
                                                    form.passwordConfirm && form.password !== form.passwordConfirm
                                                        ? 'border-[#D13A28] dark:border-[#E8422F]'
                                                        : 'border-black/[0.08] dark:border-white/[0.08]'
                                                }`}
                                                value={form.passwordConfirm}
                                                onChange={e => setForm(f => ({ ...f, passwordConfirm: e.target.value }))}
                                                placeholder="Repetir contraseña"
                                            />
                                            <button type="button" onClick={() => setVerClaveConfirm(v => !v)} tabIndex={-1}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 text-[#A8A29E] text-xs">
                                                {verClaveConfirm ? '🙈' : '👁️'}
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] font-bold text-[#A8A29E] uppercase tracking-wider">Teléfono</label>
                                    <input
                                        className="mt-1 w-full h-10 px-3 rounded-xl text-[13px] font-bold bg-[#EFEDEA] dark:bg-[#2E2E2E] text-[#1C1917] dark:text-[#F0EEE9] border border-black/[0.08] dark:border-white/[0.08] outline-none"
                                        value={form.telefono}
                                        onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))}
                                        placeholder="(011) XXXX-XXXX"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-[#A8A29E] uppercase tracking-wider">WhatsApp</label>
                                    <input
                                        className="mt-1 w-full h-10 px-3 rounded-xl text-[13px] font-bold bg-[#EFEDEA] dark:bg-[#2E2E2E] text-[#1C1917] dark:text-[#F0EEE9] border border-black/[0.08] dark:border-white/[0.08] outline-none"
                                        value={form.whatsapp}
                                        onChange={e => setForm(f => ({ ...f, whatsapp: e.target.value }))}
                                        placeholder="11 XXXX-XXXX"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-[#A8A29E] uppercase tracking-wider">Rol</label>
                                <select
                                    className="mt-1 w-full h-10 px-3 rounded-xl text-[13px] font-bold bg-[#EFEDEA] dark:bg-[#2E2E2E] text-[#1C1917] dark:text-[#F0EEE9] border border-black/[0.08] dark:border-white/[0.08] outline-none"
                                    value={form.rol}
                                    onChange={e => setForm(f => ({ ...f, rol: e.target.value }))}
                                >
                                    <option value="TECNICO">Técnico</option>
                                    <option value="ADMIN">Administrador</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={() => setModal(null)}
                                className="flex-1 h-10 rounded-xl font-bold text-xs uppercase bg-[#EFEDEA] dark:bg-[#2E2E2E] text-[#57534E] dark:text-[#A8A29E]"
                            >Cancelar</button>
                            <button
                                onClick={guardar}
                                disabled={guardando}
                                className="flex-1 h-10 rounded-xl font-bold text-xs uppercase text-white bg-[#D13A28] dark:bg-[#E8422F] disabled:opacity-50"
                            >{guardando ? 'Guardando...' : 'Guardar'}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL CONFIRMAR ELIMINACIÓN */}
            {confirmEliminar && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="w-full max-w-sm rounded-3xl p-6 bg-[#FFFFFF] dark:bg-[#242424] shadow-2xl space-y-4">
                        <h3 className="text-[16px] font-black text-[#1C1917] dark:text-[#F0EEE9]">
                            Eliminar usuario
                        </h3>
                        <p className="text-[13px] text-[#57534E] dark:text-[#A8A29E]">
                            ¿Seguro que querés eliminar a <span className="font-bold text-[#1C1917] dark:text-[#F0EEE9]">{confirmEliminar.nombre}</span>? Esta acción no se puede deshacer.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setConfirmEliminar(null)}
                                className="flex-1 h-10 rounded-xl font-bold text-xs uppercase bg-[#EFEDEA] dark:bg-[#2E2E2E] text-[#57534E] dark:text-[#A8A29E]"
                            >Cancelar</button>
                            <button
                                onClick={eliminar}
                                className="flex-1 h-10 rounded-xl font-bold text-xs uppercase text-white bg-[#D13A28] dark:bg-[#E8422F]"
                            >Eliminar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL CAMBIAR CONTRASEÑA */}
            {modalPass && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="w-full max-w-sm rounded-3xl p-6 bg-[#FFFFFF] dark:bg-[#242424] shadow-2xl space-y-4">
                        <h3 className="text-[16px] font-black text-[#1C1917] dark:text-[#F0EEE9]">
                            Cambiar clave: {modalPass.nombre}
                        </h3>
                        <div>
                            <label className="text-[10px] font-bold text-[#A8A29E] uppercase tracking-wider">Nueva contraseña</label>
                            <div className="relative mt-1">
                                <input
                                    type={verNuevaClave ? 'text' : 'password'}
                                    className="w-full h-10 px-3 pr-9 rounded-xl text-[13px] font-bold bg-[#EFEDEA] dark:bg-[#2E2E2E] text-[#1C1917] dark:text-[#F0EEE9] border border-black/[0.08] dark:border-white/[0.08] outline-none"
                                    value={nuevaClave}
                                    onChange={e => setNuevaClave(e.target.value)}
                                    placeholder="Mínimo 6 caracteres"
                                />
                                <button type="button" onClick={() => setVerNuevaClave(v => !v)} tabIndex={-1}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[#A8A29E] text-xs">
                                    {verNuevaClave ? '🙈' : '👁️'}
                                </button>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => { setModalPass(null); setNuevaClave(''); }}
                                className="flex-1 h-10 rounded-xl font-bold text-xs uppercase bg-[#EFEDEA] dark:bg-[#2E2E2E] text-[#57534E] dark:text-[#A8A29E]"
                            >Cancelar</button>
                            <button
                                onClick={guardarClave}
                                className="flex-1 h-10 rounded-xl font-bold text-xs uppercase text-white bg-[#D13A28] dark:bg-[#E8422F]"
                            >Guardar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
