import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { guardarTokenParaSW } from '../utils/pushTokenCache';
import api from '../services/api';

const AuthContext = createContext(null);

// Cada cuánto se intenta renovar el access token de forma proactiva mientras
// la app está abierta/en foreground — no hace falta que sea frecuente, el
// objetivo es que un usuario que abre la app aunque sea una vez al día nunca
// se encuentre con el token cacheado para las notificaciones push (ver
// pushTokenCache.js / service-worker.js) vencido. 6hs dentro de una ventana
// de 24hs da margen de sobra.
const INTERVALO_REFRESH_MS = 6 * 60 * 60 * 1000;

export function AuthProvider({ children }) {
    const [token, setToken] = useState(() => localStorage.getItem('auth_token'));
    const [usuario, setUsuario] = useState(() => {
        const u = localStorage.getItem('auth_usuario');
        return u ? JSON.parse(u) : null;
    });
    const refreshTokenRef = useRef(localStorage.getItem('auth_refresh_token'));

    const login = useCallback((tokenRecibido, datosUsuario, refreshTokenRecibido) => {
        localStorage.setItem('auth_token', tokenRecibido);
        localStorage.setItem('auth_usuario', JSON.stringify(datosUsuario));
        if (datosUsuario?.nombre) localStorage.setItem('tecnico_nombre', datosUsuario.nombre);
        if (refreshTokenRecibido) {
            localStorage.setItem('auth_refresh_token', refreshTokenRecibido);
            refreshTokenRef.current = refreshTokenRecibido;
        }
        setToken(tokenRecibido);
        setUsuario(datosUsuario);
    }, []);

    const logout = useCallback(() => {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_usuario');
        localStorage.removeItem('auth_refresh_token');
        localStorage.removeItem('tecnico_nombre');
        refreshTokenRef.current = null;
        setToken(null);
        setUsuario(null);
    }, []);

    // Espeja el token en IndexedDB para que el service worker pueda leerlo
    // cuando llega un push con la app cerrada (ver pushTokenCache.js).
    useEffect(() => {
        guardarTokenParaSW(token);
    }, [token]);

    // Renovación proactiva del access token vía el refresh token guardado
    // (ver AuthController.refresh / RefreshTokenService en el backend) —
    // esto es lo que evita que, si el usuario no abre la app en más de 24hs,
    // el token cacheado para las notificaciones push quede vencido y las
    // notificaciones se degraden solas a un mensaje genérico sin deep-link.
    useEffect(() => {
        if (!token) return;

        let cancelado = false;
        const renovar = async () => {
            const rt = refreshTokenRef.current;
            if (!rt) return;
            try {
                const { data } = await api.post('/auth/refresh', { refreshToken: rt });
                if (!cancelado && data?.accessToken) {
                    localStorage.setItem('auth_token', data.accessToken);
                    setToken(data.accessToken);
                }
            } catch {
                // Si el refresh token también venció o fue revocado, no hay
                // nada para hacer acá — el próximo pedido real a la API va a
                // devolver 401 y el interceptor de api.js va a forzar logout.
            }
        };

        // Al recuperar el foco/visibilidad (volver a abrir la app o el celu)
        // es un buen momento para renovar sin esperar al intervalo.
        const alVolverAlFrente = () => {
            if (document.visibilityState === 'visible') renovar();
        };
        document.addEventListener('visibilitychange', alVolverAlFrente);
        const intervalId = setInterval(renovar, INTERVALO_REFRESH_MS);

        return () => {
            cancelado = true;
            document.removeEventListener('visibilitychange', alVolverAlFrente);
            clearInterval(intervalId);
        };
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
