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