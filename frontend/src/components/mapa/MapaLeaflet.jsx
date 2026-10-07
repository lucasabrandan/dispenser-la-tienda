import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Mapa base (7-oct-2026): mapa libre de OpenStreetMap con Leaflet. Sin claves ni
// costo. Si algún día se quiere otro estilo (CARTO, Google…), alcanza con poner
// la plantilla de teselas en REACT_APP_MAP_TILES (y su atribución en
// REACT_APP_MAP_ATTR) en Vercel.
const TILES = process.env.REACT_APP_MAP_TILES || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const ATTR = process.env.REACT_APP_MAP_ATTR || '© OpenStreetMap';
const CENTRO_AMBA = [-34.61, -58.44];

// puntos: [{ id, lat, lng, color, etiqueta? }]
export default function MapaLeaflet({ puntos = [], seleccionado = null, onClickPunto, onClickMapa, ajustarKey, className = '' }) {
    const divRef = useRef(null);
    const mapaRef = useRef(null);
    const capaRef = useRef(null);
    const clickPuntoRef = useRef(onClickPunto);
    const clickMapaRef = useRef(onClickMapa);
    clickPuntoRef.current = onClickPunto;
    clickMapaRef.current = onClickMapa;

    useEffect(() => {
        const mapa = L.map(divRef.current, { zoomControl: true, attributionControl: true }).setView(CENTRO_AMBA, 11);
        L.tileLayer(TILES, { attribution: ATTR, maxZoom: 19 }).addTo(mapa);
        capaRef.current = L.layerGroup().addTo(mapa);
        mapa.on('click', (e) => clickMapaRef.current && clickMapaRef.current(e.latlng));
        mapaRef.current = mapa;
        // El contenedor puede cambiar de tamaño (menú lateral, pestañas)
        const ro = new ResizeObserver(() => mapa.invalidateSize());
        ro.observe(divRef.current);
        return () => { ro.disconnect(); mapa.remove(); };
    }, []);

    // Dibujar puntos
    useEffect(() => {
        const capa = capaRef.current;
        if (!capa) return;
        capa.clearLayers();
        puntos.filter(p => p.lat != null && p.lng != null).forEach(p => {
            const sel = seleccionado === p.id;
            const html = `<div class="dlt-pin${sel ? ' dlt-pin-sel' : ''}" style="--c:${p.color || '#2563EB'}">${p.etiqueta ? `<span>${p.etiqueta}</span>` : ''}</div>`;
            const tam = sel ? 34 : (p.etiqueta ? 28 : 20);
            const m = L.marker([p.lat, p.lng], {
                icon: L.divIcon({ html, className: 'dlt-pin-wrap', iconSize: [tam, tam], iconAnchor: [tam / 2, tam / 2] }),
                zIndexOffset: sel ? 1000 : 0,
                keyboard: false,
            });
            m.on('click', (e) => { L.DomEvent.stopPropagation(e); clickPuntoRef.current && clickPuntoRef.current(p); });
            capa.addLayer(m);
        });
    }, [puntos, seleccionado]);

    // Encuadrar todos los puntos cuando cambia lo que se muestra
    useEffect(() => {
        const mapa = mapaRef.current;
        if (!mapa) return;
        const conPos = puntos.filter(p => p.lat != null && p.lng != null);
        if (conPos.length === 1) mapa.setView([conPos[0].lat, conPos[0].lng], 15);
        else if (conPos.length > 1) mapa.fitBounds(L.latLngBounds(conPos.map(p => [p.lat, p.lng])).pad(0.12), { maxZoom: 15 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ajustarKey]);

    // Centrar en el seleccionado
    useEffect(() => {
        const mapa = mapaRef.current;
        const p = puntos.find(x => x.id === seleccionado);
        if (mapa && p && p.lat != null) mapa.panTo([p.lat, p.lng], { animate: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [seleccionado]);

    return <div ref={divRef} className={`mapa-dlt ${className}`} />;
}

export const linkGps = (direccion, lat, lng) => lat != null && lng != null
    ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
    : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(direccion || '')}`;

// Ruta del día en Google Maps: paradas en orden (Google acepta hasta 9 intermedias)
export function linkRuta(paradas) {
    const ps = paradas.filter(p => p.lat != null || p.direccion).map(p => (p.lat != null ? `${p.lat},${p.lng}` : p.direccion));
    if (!ps.length) return null;
    const destino = ps[ps.length - 1];
    const intermedias = ps.slice(0, -1).slice(0, 9);
    return `https://www.google.com/maps/dir/?api=1&travelmode=driving&destination=${encodeURIComponent(destino)}`
        + (intermedias.length ? `&waypoints=${encodeURIComponent(intermedias.join('|'))}` : '');
}
