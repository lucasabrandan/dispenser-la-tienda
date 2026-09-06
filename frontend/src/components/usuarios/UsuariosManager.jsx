import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { getUsuarios, crearUsuario, editarUsuario, cambiarPassword, eliminarUsuario } from '../../services/api';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { LuShieldCheck, LuWrench, LuKey, LuPencil, LuLock, LuCircleCheck, LuTrash2, LuEyeOff, LuEye } from 'react-icons/lu';

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
    const CONDICIONES_DEFAULT = 'Precio incluye IVA (efectivo sin factura: precio sin IVA)  ·  Visita sin reparacion: 50% MO  ·  Garantia 90 dias MO  ·  Valido 7 dias';
    const [condicionesPDF, setCondicionesPDF] = useState(() => localStorage.getItem('empresa_condiciones_pdf') || CONDICIONES_DEFAULT);
    const [condGuardado, setCondGuardado] = useState(false);

    const guardarCondiciones = () => {
        localStorage.setItem('empresa_condiciones_pdf', condicionesPDF.trim() || CONDICIONES_DEFAULT);
        setCondGuardado(true);
        toast.success('Condiciones guardadas');
        setTimeout(() => setCondGuardado(false), 2000);
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
            if (e.response?.status === 409) {
                toast.error(e.response?.data?.mensaje || 'El usuario ya existe');
            } else {
                toast.error('Error al guardar');
            }
        } finally { setGuardando(false); }
    };

    const toggleActivo = async (u) => {
        try {
            await editarUsuario(u.id, { nombre: u.nombre, rol: u.rol, activo: !u.activo, telefono: u.telefono || null, whatsapp: u.whatsapp || null });
            toast.success(u.activo ? 'Usuario desactivado' : 'Usuario activado');
            cargar();
        } catch (e) {
            toast.error(e.response?.data?.mensaje || 'Error al actualizar');
        }
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
        <div className="min-h-screen pb-28 md:pb-8 font-sans bg-page transition-colors">

            {/* Header sticky */}
            <div className="sticky top-0 z-10 bg-page border-b border-black/[0.04] dark:border-white/[0.04]">
                <div className="max-w-6xl mx-auto px-4 md:px-6 pt-4 pb-3 space-y-2.5">
                    <h2 className="hidden md:block text-2xl font-black uppercase tracking-tight text-ink">Usuarios</h2>
                    <div className="flex gap-1.5 items-center">
                        {['TODOS', 'ADMIN', 'TECNICO'].map(rol => (
                            <button key={rol} onClick={() => setFiltroRol(rol)}
                                className={`h-8 px-3 rounded-lg font-bold text-label uppercase transition-all active:scale-95 ${
                                    filtroRol === rol
                                        ? 'bg-brand-red text-white'
                                        : 'bg-card text-muted shadow-sm border border-black/[0.05] dark:border-white/[0.05]'
                                }`}>
                                {rol === 'TODOS' ? `Todos (${usuarios.length})` : `${ROL_LABEL[rol]} (${usuarios.filter(u => u.rol === rol).length})`}
                            </button>
                        ))}
                        <div className="flex-1" />
                        <button onClick={abrirCrear}
                            className="h-8 px-4 rounded-lg font-bold text-label text-white uppercase transition-all active:scale-95 bg-brand-red">
                            + Nuevo
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-4 md:px-6 pt-3 space-y-3">

                {/* CONFIGURACIÓN DE EMPRESA — solo ADMIN */}
                {usuarioActual?.rol === 'ADMIN' && (
                    <div className="rounded-2xl bg-card border border-black/[0.07] dark:border-white/[0.07] p-4 space-y-3">
                        <p className="text-label font-bold text-muted uppercase tracking-wider">Configuración de empresa</p>
                        <div>
                            <label className="text-label font-bold text-muted uppercase tracking-wider">
                                Condiciones del presupuesto (texto que aparece al pie del PDF)
                            </label>
                            <div className="mt-1 flex gap-2">
                                <textarea
                                    className="flex-1 h-16 px-3 py-2 rounded-xl text-body bg-chip text-ink border border-black/[0.08] dark:border-white/[0.08] outline-none resize-none"
                                    value={condicionesPDF}
                                    onChange={e => setCondicionesPDF(e.target.value)}
                                    placeholder="Garantía 90 días mano de obra · Repuestos según fabricante..."
                                />
                                <button
                                    onClick={guardarCondiciones}
                                    className={`h-10 px-4 rounded-xl font-bold text-label text-white transition-all active:scale-95 self-start ${
                                        condGuardado ? 'bg-[#16a34a]' : 'bg-brand-red hover:opacity-90'
                                    }`}
                                >
                                    {condGuardado ? '✓' : 'Guardar'}
                                </button>
                            </div>
                            <p className="text-caption text-muted mt-1">
                                Se muestra en presupuestos y órdenes de servicio.
                            </p>
                        </div>
                    </div>
                )}

                {/* LISTA */}
                {cargando ? (
                    <div className="text-center py-16 font-bold text-muted">Cargando...</div>
                ) : usuariosFiltrados.length === 0 ? (
                    <div className="text-center py-16 rounded-2xl bg-card text-muted font-bold">
                        Sin usuarios en esta categoría
                    </div>
                ) : (
                    <div className="flex flex-col gap-3">
                        {usuariosFiltrados.map(u => (
                            <div key={u.id}
                                 className={`rounded-2xl bg-card overflow-hidden border ${
                                     u.activo
                                         ? 'border-black/[0.07] dark:border-white/[0.07]'
                                         : 'border-dashed border-black/[0.15] dark:border-white/[0.15] opacity-60'
                                 }`}>
                                <div className="p-4 flex items-center justify-between gap-3">
                                    {/* Avatar */}
                                    <div className="w-10 h-10 rounded-xl bg-[#D13A28]/10 dark:bg-[#E8422F]/10 flex items-center justify-center text-[18px] shrink-0">
                                        {u.rol === 'ADMIN' ? <LuShieldCheck size={18} /> : <LuWrench size={18} />}
                                    </div>
                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <p className="font-black text-body-lg text-ink">{u.nombre}</p>
                                            <span className={`text-label font-bold px-2 py-0.5 rounded-md uppercase ${ROL_COLOR[u.rol]}`}>
                                                {ROL_LABEL[u.rol]}
                                            </span>
                                            {!u.activo && (
                                                <span className="text-label font-bold px-2 py-0.5 rounded-md uppercase bg-muted/20 text-muted">
                                                    Inactivo
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-caption text-muted mt-0.5">@{u.username}{u.telefono ? `  ·  ${u.telefono}` : ''}</p>
                                    </div>
                                    {/* Acciones */}
                                    <div className="flex gap-2 shrink-0">
                                        <button
                                            onClick={() => { setModalPass(u); setNuevaClave(''); }}
                                            title="Cambiar contraseña"
                                            className="w-9 h-9 rounded-xl flex items-center justify-center text-sm bg-chip active:scale-90 transition-all"
                                        ><LuKey size={15} /></button>
                                        <button
                                            onClick={() => abrirEditar(u)}
                                            title="Editar"
                                            className="w-9 h-9 rounded-xl flex items-center justify-center text-sm bg-chip active:scale-90 transition-all"
                                        ><LuPencil size={15} /></button>
                                        <button
                                            onClick={() => toggleActivo(u)}
                                            title={u.activo ? 'Desactivar' : 'Activar'}
                                            className="w-9 h-9 rounded-xl flex items-center justify-center text-sm bg-chip active:scale-90 transition-all"
                                        >{u.activo ? <LuLock size={15} /> : <LuCircleCheck size={15} />}</button>
                                        {usuarioActual?.id !== u.id && (
                                            <button
                                                onClick={() => setConfirmEliminar(u)}
                                                title="Eliminar"
                                                className="w-9 h-9 rounded-xl flex items-center justify-center text-sm bg-[#D13A28]/10 dark:bg-[#E8422F]/10 active:scale-90 transition-all"
                                            ><LuTrash2 size={15} /></button>
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
                    <div className="w-full max-w-sm rounded-3xl p-6 bg-card shadow-2xl space-y-4">
                        <h3 className="text-title font-black text-ink">
                            {modal === 'crear' ? 'Nuevo usuario' : `Editar: ${modal.nombre}`}
                        </h3>

                        <div className="space-y-3">
                            <div>
                                <label className="text-label font-bold text-muted uppercase tracking-wider">Nombre completo</label>
                                <input
                                    className="mt-1 w-full h-10 px-3 rounded-xl text-body font-bold bg-chip text-ink border border-black/[0.08] dark:border-white/[0.08] outline-none"
                                    value={form.nombre}
                                    onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                                    placeholder="Ej: Juan Pérez"
                                />
                            </div>
                            {modal === 'crear' && (
                                <>
                                    <div>
                                        <label className="text-label font-bold text-muted uppercase tracking-wider">Usuario (login)</label>
                                        <input
                                            className="mt-1 w-full h-10 px-3 rounded-xl text-body font-bold bg-chip text-ink border border-black/[0.08] dark:border-white/[0.08] outline-none"
                                            value={form.username}
                                            // Mismo fix que en el login: un usuario creado con un
                                            // espacio de más después no puede loguearse con lo que
                                            // ve escrito, sin ninguna pista de por qué.
                                            onChange={e => setForm(f => ({ ...f, username: e.target.value.replace(/\s+/g, '') }))}
                                            placeholder="Ej: juan"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-label font-bold text-muted uppercase tracking-wider">Contraseña</label>
                                        <div className="relative mt-1">
                                            <input
                                                type={verClave ? 'text' : 'password'}
                                                className="w-full h-10 px-3 pr-9 rounded-xl text-body font-bold bg-chip text-ink border border-black/[0.08] dark:border-white/[0.08] outline-none"
                                                value={form.password}
                                                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                                                placeholder="Mínimo 6 caracteres"
                                            />
                                            <button type="button" onClick={() => setVerClave(v => !v)} tabIndex={-1}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted text-label">
                                                {verClave ? <LuEyeOff size={14} /> : <LuEye size={14} />}
                                            </button>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-label font-bold text-muted uppercase tracking-wider">Confirmar contraseña</label>
                                        <div className="relative mt-1">
                                            <input
                                                type={verClaveConfirm ? 'text' : 'password'}
                                                className={`w-full h-10 px-3 pr-9 rounded-xl text-body font-bold bg-chip text-ink outline-none border ${
                                                    form.passwordConfirm && form.password !== form.passwordConfirm
                                                        ? 'border-brand-red'
                                                        : 'border-black/[0.08] dark:border-white/[0.08]'
                                                }`}
                                                value={form.passwordConfirm}
                                                onChange={e => setForm(f => ({ ...f, passwordConfirm: e.target.value }))}
                                                placeholder="Repetir contraseña"
                                            />
                                            <button type="button" onClick={() => setVerClaveConfirm(v => !v)} tabIndex={-1}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted text-label">
                                                {verClaveConfirm ? <LuEyeOff size={14} /> : <LuEye size={14} />}
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-label font-bold text-muted uppercase tracking-wider">Teléfono</label>
                                    <input
                                        className="mt-1 w-full h-10 px-3 rounded-xl text-body font-bold bg-chip text-ink border border-black/[0.08] dark:border-white/[0.08] outline-none"
                                        value={form.telefono}
                                        onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))}
                                        placeholder="(011) XXXX-XXXX"
                                    />
                                </div>
                                <div>
                                    <label className="text-label font-bold text-muted uppercase tracking-wider">WhatsApp</label>
                                    <input
                                        className="mt-1 w-full h-10 px-3 rounded-xl text-body font-bold bg-chip text-ink border border-black/[0.08] dark:border-white/[0.08] outline-none"
                                        value={form.whatsapp}
                                        onChange={e => setForm(f => ({ ...f, whatsapp: e.target.value }))}
                                        placeholder="11 XXXX-XXXX"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-label font-bold text-muted uppercase tracking-wider">Rol</label>
                                <select
                                    className="mt-1 w-full h-10 px-3 rounded-xl text-body font-bold bg-chip text-ink border border-black/[0.08] dark:border-white/[0.08] outline-none"
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
                                className="flex-1 h-10 rounded-xl font-bold text-label uppercase bg-chip text-secondary"
                            >Cancelar</button>
                            <button
                                onClick={guardar}
                                disabled={guardando}
                                className="flex-1 h-10 rounded-xl font-bold text-label uppercase text-white bg-brand-red disabled:opacity-50"
                            >{guardando ? 'Guardando...' : 'Guardar'}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL CONFIRMAR ELIMINACIÓN */}
            {confirmEliminar && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="w-full max-w-sm rounded-3xl p-6 bg-card shadow-2xl space-y-4">
                        <h3 className="text-title font-black text-ink">
                            Eliminar usuario
                        </h3>
                        <p className="text-body text-secondary">
                            ¿Seguro que querés eliminar a <span className="font-bold text-ink">{confirmEliminar.nombre}</span>? Esta acción no se puede deshacer.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setConfirmEliminar(null)}
                                className="flex-1 h-10 rounded-xl font-bold text-label uppercase bg-chip text-secondary"
                            >Cancelar</button>
                            <button
                                onClick={eliminar}
                                className="flex-1 h-10 rounded-xl font-bold text-label uppercase text-white bg-brand-red"
                            >Eliminar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL CAMBIAR CONTRASEÑA */}
            {modalPass && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="w-full max-w-sm rounded-3xl p-6 bg-card shadow-2xl space-y-4">
                        <h3 className="text-title font-black text-ink">
                            Cambiar clave: {modalPass.nombre}
                        </h3>
                        <div>
                            <label className="text-label font-bold text-muted uppercase tracking-wider">Nueva contraseña</label>
                            <div className="relative mt-1">
                                <input
                                    type={verNuevaClave ? 'text' : 'password'}
                                    className="w-full h-10 px-3 pr-9 rounded-xl text-body font-bold bg-chip text-ink border border-black/[0.08] dark:border-white/[0.08] outline-none"
                                    value={nuevaClave}
                                    onChange={e => setNuevaClave(e.target.value)}
                                    placeholder="Mínimo 6 caracteres"
                                />
                                <button type="button" onClick={() => setVerNuevaClave(v => !v)} tabIndex={-1}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted text-label">
                                    {verNuevaClave ? <LuEyeOff size={14} /> : <LuEye size={14} />}
                                </button>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => { setModalPass(null); setNuevaClave(''); }}
                                className="flex-1 h-10 rounded-xl font-bold text-label uppercase bg-chip text-secondary"
                            >Cancelar</button>
                            <button
                                onClick={guardarClave}
                                className="flex-1 h-10 rounded-xl font-bold text-label uppercase text-white bg-brand-red"
                            >Guardar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
