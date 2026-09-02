import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { guardarTokenParaSW } from '../utils/pushTokenCache';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [token, setToken] = useState(() => localStorage.getItem('auth_token'));
    const [usuario, setUsuario] = useState(() => {
        const u = localStorage.getItem('auth_usuario');
        return u ? JSON.parse(u) : null;
    });

    const login = useCallback((tokenRecibido, datosUsuario) => {
        localStorage.setItem('auth_token', tokenRecibido);
        localStorage.setItem('auth_usuario', JSON.stringify(datosUsuario));
        if (datosUsuario?.nombre) localStorage.setItem('tecnico_nombre', datosUsuario.nombre);
        setToken(tokenRecibido);
        setUsuario(datosUsuario);
    }, []);

    const logout = useCallback(() => {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_usuario');
        localStorage.removeItem('tecnico_nombre');
        setToken(null);
        setUsuario(null);
    }, []);

    // Espeja el token en IndexedDB para que el service worker pueda leerlo
    // cuando llega un push con la app cerrada (ver pushTokenCache.js).
    useEffect(() => {
        guardarTokenParaSW(token);
    }, [token]);

    return (
        <AuthContext.Provider value={{
            token,
            usuario,
            login,
            logout,
            autenticado: !!token,
            esAdmin: usuario?.rol === 'ADMIN',
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
