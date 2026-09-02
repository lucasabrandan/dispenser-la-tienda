import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import toast from 'react-hot-toast';
import logo from '../../assets/logo-dispenser.svg';
import { LuEyeOff, LuEye } from 'react-icons/lu';

export default function LoginPage() {
    const { login } = useAuth();
    const [form, setForm] = useState({ username: '', password: '' });
    const [cargando, setCargando] = useState(false);
    const [verClave, setVerClave] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.username || !form.password) return;
        setCargando(true);
        try {
            const { data } = await api.post('/auth/login', form);
            login(data.token, { id: data.id, username: data.username, nombre: data.nombre, rol: data.rol, firma: data.firma, sueldoObjetivo: data.sueldoObjetivo });
        } catch (err) {
            // 401 = credenciales incorrectas (el backend ya no distingue si
            // fue el usuario o la contraseña — no hace falta que el usuario
            // lo sepa). 400 = quedó algún campo vacío (caso raro: solo
            // espacios en la contraseña, ya que el usuario no puede llevar
            // espacios — ver onChange de abajo). Cualquier otra cosa sí es
            // un problema real de conexión con el servidor.
            const status = err.response?.status;
            const msg = status === 401
                ? 'Usuario o contraseña incorrectos'
                : status === 400
                    ? 'Completá usuario y contraseña'
                    : 'Error al conectar con el servidor';
            toast.error(msg);
        } finally {
            setCargando(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-page px-4">
            <div className="w-full max-w-sm">

                {/* Logo */}
                <div className="flex flex-col items-center mb-8">
                    <img src={logo} alt="Dispenser La Tienda" className="h-16 mb-4 drop-shadow-sm dark:brightness-110" />
                    <p className="text-[10px] font-black text-muted uppercase tracking-[0.25em]">
                        Sistema de Logística
                    </p>
                    <p className="text-[9px] text-muted mt-1">
                        www.dispenserlatienda.com.ar
                    </p>
                </div>

                {/* Card */}
                <div className="bg-card rounded-2xl p-8 shadow-xl border border-black/[0.06] dark:border-white/[0.06]">
                    <h1 className="text-lg font-black text-ink mb-6 tracking-tight">
                        Iniciar sesión
                    </h1>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-[11px] font-black text-muted uppercase tracking-widest mb-1.5">
                                Usuario
                            </label>
                            <input
                                type="text"
                                autoComplete="username"
                                value={form.username}
                                // Ningún usuario del sistema lleva espacios (ver
                                // UsuarioAdminController) — se descartan apenas se
                                // tipean, en vez de dejar que arruinen el login en
                                // silencio (típico: el teclado del celu agrega un
                                // espacio solo al autocompletar).
                                onChange={e => setForm(f => ({ ...f, username: e.target.value.replace(/\s+/g, '') }))}
                                className="w-full px-4 py-3 rounded-xl text-sm font-bold outline-none bg-chip text-ink placeholder-muted border border-black/10 dark:border-white/10 focus:border-[#D13A28] dark:focus:border-[#E8422F] transition-all"
                                placeholder="admin"
                                disabled={cargando}
                            />
                        </div>

                        <div>
                            <label className="block text-[11px] font-black text-muted uppercase tracking-widest mb-1.5">
                                Contraseña
                            </label>
                            <div className="relative">
                                <input
                                    type={verClave ? 'text' : 'password'}
                                    autoComplete="current-password"
                                    value={form.password}
                                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                                    className="w-full px-4 py-3 pr-11 rounded-xl text-sm font-bold outline-none bg-chip text-ink placeholder-muted border border-black/10 dark:border-white/10 focus:border-[#D13A28] dark:focus:border-[#E8422F] transition-all"
                                    placeholder="••••••••"
                                    disabled={cargando}
                                />
                                <button
                                    type="button"
                                    onClick={() => setVerClave(v => !v)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-[#1C1917] dark:hover:text-[#F0EEE9] transition-colors text-sm"
                                    tabIndex={-1}
                                >
                                    {verClave ? <LuEyeOff size={14} /> : <LuEye size={14} />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={cargando || !form.username || !form.password}
                            className="w-full py-3 rounded-xl font-black text-sm text-white bg-brand-red hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                        >
                            {cargando ? 'Ingresando...' : 'Ingresar'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
