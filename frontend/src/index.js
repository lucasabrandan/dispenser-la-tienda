import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ThemeProvider } from './context/ThemeContext';
import './index.css';

// Mobile: scroll al input cuando aparece el teclado
if (window.visualViewport) {
    let lastFocused = null;
    document.addEventListener('focusin', (e) => {
        if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) {
            lastFocused = e.target;
        }
    });
    // ¿Está abierto el teclado? Se mide de verdad (la pantalla visible se achica),
    // en vez de suponerlo porque hay un campo enfocado. Antes un <select> o una
    // fecha elegidos dejaban el foco puesto y escondían "Cerrar ticket" hasta tocar
    // en otro lado (bug 3-oct-2026).
    const altoBase = { v: window.innerHeight };
    const medirTeclado = () => {
        const vv = window.visualViewport;
        if (!document.activeElement || !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) altoBase.v = Math.max(altoBase.v, window.innerHeight);
        const abierto = vv.height < altoBase.v * 0.78;
        document.body.classList.toggle('teclado-abierto', abierto);
    };
    window.visualViewport.addEventListener('resize', medirTeclado);
    window.addEventListener('orientationchange', () => { altoBase.v = window.innerHeight; setTimeout(medirTeclado, 300); });
    window.visualViewport.addEventListener('resize', () => {
        if (lastFocused && document.activeElement === lastFocused) {
            setTimeout(() => {
                lastFocused.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 100);
        }
    });
}

// Service worker — necesario para las notificaciones push (ver
// utils/pushNotifications.js). No cachea nada de la app.
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js').catch(() => {});
    });
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </React.StrictMode>
);