import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import toast from 'react-hot-toast';
import logo from '../../assets/logo-dispenser.svg';

export default function LoginPage() {
    const { login } = useAuth();
    const [form, setForm] = useState({ username: '', password: '' });
    const [cargando, setCargando] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.username || !form.password) return;
        setCargando(true);
        try {
            const { data } = await api.post('/auth/login', form);
            login(data.token, { username: data.username, nombre: data.nombre, rol: data.rol });
        } catch (err) {
            const msg = err.response?.status === 401
                ? 'Usuario o contraseña incorrectos'
                : 'Error al conectar con el servidor';
            toast.error(msg);
        } finally {
            setCargando(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#C8C4BE] dark:bg-[#141414] px-4">
            <div className="w-full max-w-sm">

                {/* Logo */}
                <div className="flex flex-col items-center mb-8">
                    <img src={logo} alt="Dispenser La Tienda" className="h-16 mb-4 drop-shadow-sm dark:brightness-110" />
                    <p className="text-[10px] font-black text-[#A8A29E] uppercase tracking-[0.25em]">
                        Sistema de Logística
                    </p>
                </div>

                {/* Card */}
                <div className="bg-[#EDEAE6] dark:bg-[#242424] rounded-2xl p-8 shadow-xl border border-black/[0.06] dark:border-white/[0.06]">
                    <h1 className="text-lg font-black text-[#1C1917] dark:text-[#F0EEE9] mb-6 tracking-tight">
                        Iniciar sesión
                    </h1>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-[11px] font-black text-[#A8A29E] uppercase tracking-widest mb-1.5">
                                Usuario
                            </label>
                            <input
                                type="text"
                                autoComplete="username"
                                value={form.username}
                                onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                                className="w-full px-4 py-3 rounded-xl text-sm font-bold outline-none bg-[#C0BCB6] dark:bg-[#2E2E2E] text-[#1C1917] dark:text-[#F0EEE9] placeholder-[#A8A29E] border border-black/10 dark:border-white/10 focus:border-[#D13A28] dark:focus:border-[#E8422F] transition-all"
                                placeholder="admin"
                                disabled={cargando}
                            />
                        </div>

                        <div>
                            <label className="block text-[11px] font-black text-[#A8A29E] uppercase tracking-widest mb-1.5">
                                Contraseña
                            </label>
                            <input
                                type="password"
                                autoComplete="current-password"
                                value={form.password}
                                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                                className="w-full px-4 py-3 rounded-xl text-sm font-bold outline-none bg-[#C0BCB6] dark:bg-[#2E2E2E] text-[#1C1917] dark:text-[#F0EEE9] placeholder-[#A8A29E] border border-black/10 dark:border-white/10 focus:border-[#D13A28] dark:focus:border-[#E8422F] transition-all"
                                placeholder="••••••••"
                                disabled={cargando}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={cargando || !form.username || !form.password}
                            className="w-full py-3 rounded-xl font-black text-sm text-white bg-[#D13A28] dark:bg-[#E8422F] hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                        >
                            {cargando ? 'Ingresando...' : 'Ingresar'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
