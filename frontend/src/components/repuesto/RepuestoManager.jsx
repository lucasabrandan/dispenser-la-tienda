import React, { useState, useCallback } from 'react';
import { LuPackage, LuListChecks, LuDownload, LuFileText, LuArrowUpDown } from 'react-icons/lu';
import { CONTENEDOR, PantallaHeader, BotonPrimario, BotonHerramienta, Herramientas, PAGINA, BotonFlotante } from '../ui/Pantalla';
import BusquedaBar from '../ui/BusquedaBar';
import { useRepuestoManager } from '../../hooks/useRepuestoManager';
import RepuestoCard from './RepuestoCard';
import RepuestoModal from './RepuestoModal';
import StockQuickSheet from './StockQuickSheet';
import ModalPrecioMasivo from '../productos/Modalpreciomasivo';
import Paginacion from '../ui/Paginacion';
import { useSwipeGesture } from '../../hooks/useSwipeGesture';

// Opciones de orden (Lucas, 7-sep-2026: antes un <select> suelto al lado del
// contador -- ahora un chip "Orden" con el mismo look que el chip de período
// que ya usan Servicio/Venta/Presupuestos, para que las 5 pantallas de
// listados se sientan iguales).
const ORDEN_OPTIONS = [
    { value: 'az', label: 'A → Z' },
    { value: 'za', label: 'Z → A' },
    { value: 'precio-asc', label: 'Precio ↑' },
    { value: 'precio-desc', label: 'Precio ↓' },
    { value: 'stock', label: 'Stock ↑' },
];

export default function RepuestoManager() {
    const [stockSheetOpen, setStockSheetOpen] = useState(false);
    const [mostrarOrden, setMostrarOrden] = useState(false);

    const {
        productos, productosFiltrados, productosPagina,
        pagina, totalPaginas, irA, next, prev,
        modalAbierto, productoEdicion,
        busqueda, setBusqueda,
        ordenProductos, setOrdenProductos,
        seleccionados, setSeleccionados, modoSeleccion, setModoSeleccion,
        modalPrecio, setModalPrecio,
        gananciamasiva, setGananciaMasiva,
        markupMasivo, setMarkupMasivo,
        impuestosMasivo, setImpuestosMasivo,
        todosSeleccionados,
        valorTotalInventario, itemsBajoStock,
        cargarProductos, eliminar,
        eliminarSeleccionados, exportarSeleccionados, exportarTodos,
        exportarCatalogoSeleccionados, exportarCatalogoTodos,
        aplicarPrecioMasivo, toggleSeleccion, seleccionarTodos,
        cancelarSeleccion,
        abrirNuevo, abrirEditar, cerrarModal,
    } = useRepuestoManager();

    // Long-press para selección masiva
    const longPressRef = React.useRef(null);
    const iniciarLP = (id) => {
        longPressRef.current = setTimeout(() => {
            setModoSeleccion(true);
            setSeleccionados(new Set([id]));
        }, 500);
    };
    const cancelarLP = () => { if (longPressRef.current) clearTimeout(longPressRef.current); };

    // Swipe para paginar
    const pageIds = Array.from({ length: totalPaginas }, (_, i) => String(i + 1));
    const handleSwipePage = useCallback((id) => irA(Number(id)), [irA]);
    const swipeHandlers = useSwipeGesture(pageIds, String(pagina), handleSwipePage);

    return (
        <div className={PAGINA} {...swipeHandlers}>

            <div className={CONTENEDOR}>
                <PantallaHeader titulo="Productos" subtitulo="Repuestos y productos: precios y stock"
                    busqueda={<BusquedaBar valor={busqueda} onChange={setBusqueda} placeholder="Nombre o código…" />}
                    accion={<BotonPrimario onClick={abrirNuevo}>Nuevo</BotonPrimario>} />

                <Herramientas>
                    <BotonHerramienta icono={LuArrowUpDown} activo={mostrarOrden} onClick={() => setMostrarOrden(v => !v)} textoEnCelular>
                        {ORDEN_OPTIONS.find(o => o.value === ordenProductos)?.label || 'Orden'}
                    </BotonHerramienta>
                    <BotonHerramienta icono={LuPackage} onClick={() => setStockSheetOpen(true)}>Ajuste stock</BotonHerramienta>
                    <BotonHerramienta icono={LuListChecks} activo={modoSeleccion} onClick={() => (modoSeleccion ? cancelarSeleccion() : setModoSeleccion(true))}>
                        {modoSeleccion ? 'Cancelar' : 'Seleccionar'}
                    </BotonHerramienta>
                    <BotonHerramienta icono={LuDownload} onClick={exportarTodos}>Exportar lista</BotonHerramienta>
                    <BotonHerramienta icono={LuFileText} onClick={exportarCatalogoTodos}>Catálogo</BotonHerramienta>
                </Herramientas>

                {/* Resumen — misma línea de totales que Trabajos */}
                <div className="flex flex-wrap items-baseline justify-end gap-x-3 gap-y-1 text-caption text-muted">
                    {productos.length > 0 && (
                        <span className="flex items-baseline gap-1.5">En mercadería
                            <span className="text-body-lg font-black text-ink">${Math.round(valorTotalInventario).toLocaleString('es-AR')}</span></span>
                    )}
                    <span>· {productosFiltrados.length} producto{productosFiltrados.length !== 1 ? 's' : ''}</span>
                    {itemsBajoStock > 0 && <span className="font-bold text-brand-red">· {itemsBajoStock} con stock bajo</span>}
                </div>

                {/* Orden — colapsado por defecto, se abre desde el chip del header */}
                {mostrarOrden && (
                    <div className="grid grid-cols-2 gap-1.5 p-2 rounded-xl bg-card shadow-sm border border-black/[0.05] dark:border-white/[0.05]">
                        {ORDEN_OPTIONS.map(o => (
                            <button key={o.value} onClick={() => { setOrdenProductos(o.value); setMostrarOrden(false); }}
                                className={`h-8 rounded-lg text-label font-bold transition-all active:scale-95 ${
                                    ordenProductos === o.value ? 'bg-brand-red text-white' : 'bg-panel text-secondary'
                                }`}>
                                {o.label}
                            </button>
                        ))}
                    </div>
                )}

                {/* Barra selección masiva */}
                {modoSeleccion && (
                    <div className="flex items-center gap-1.5 p-2.5 rounded-xl bg-card shadow-sm border border-black/[0.05] dark:border-white/[0.05] flex-wrap">
                        <span className="text-caption font-bold text-ink">
                            {seleccionados.size} sel.
                        </span>
                        <button onClick={seleccionarTodos}
                            className="h-7 px-3 rounded-lg font-bold text-label bg-chip text-secondary active:scale-95">
                            {todosSeleccionados ? 'Ninguno' : 'Todos'}
                        </button>
                        <button onClick={exportarSeleccionados} disabled={seleccionados.size === 0}
                            className="h-7 px-3 rounded-lg font-bold text-label bg-chip text-secondary active:scale-95 disabled:opacity-40">
                            Lista
                        </button>
                        <button onClick={exportarCatalogoSeleccionados} disabled={seleccionados.size === 0}
                            className="h-7 px-3 rounded-lg font-bold text-label bg-chip text-secondary active:scale-95 disabled:opacity-40">
                            Catálogo
                        </button>
                        <button onClick={() => setModalPrecio(true)} disabled={seleccionados.size === 0}
                            className="h-7 px-3 rounded-lg font-bold text-label bg-[#D48800]/10 text-brand-amber active:scale-95 disabled:opacity-40">
                            % Precio
                        </button>
                        <button onClick={eliminarSeleccionados} disabled={seleccionados.size === 0}
                            className="h-7 px-3 rounded-lg font-bold text-label text-brand-red active:scale-95 disabled:opacity-40">
                            Eliminar
                        </button>
                        <div className="flex-1" />
                        <button onClick={cancelarSeleccion}
                            className="h-7 px-3 rounded-lg font-bold text-label text-muted active:scale-95">
                            Cancelar
                        </button>
                    </div>
                )}

                {/* Grid de productos */}
                {productosFiltrados.length === 0 ? (
                    <div className="text-center py-16 rounded-2xl bg-card border border-black/[0.07] dark:border-white/[0.07]">
                        <p className="mb-2 flex justify-center"><LuPackage size={28} /></p>
                        <p className="text-body font-bold text-muted">
                            {busqueda ? `Sin resultados para "${busqueda}"` : 'Sin productos. Creá uno.'}
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                        {productosPagina.map(r => (
                            <div key={r.id}
                                onTouchStart={() => iniciarLP(r.id)} onTouchEnd={cancelarLP} onTouchMove={cancelarLP}
                                onMouseDown={() => iniciarLP(r.id)} onMouseUp={cancelarLP} onMouseLeave={cancelarLP}>
                                <RepuestoCard
                                    repuesto={r}
                                    modoSeleccion={modoSeleccion}
                                    estaSeleccionado={seleccionados.has(r.id)}
                                    onEditar={abrirEditar}
                                    onEliminar={eliminar}
                                    onToggleSeleccion={toggleSeleccion}
                                />
                            </div>
                        ))}
                    </div>
                )}

                <Paginacion pagina={pagina} totalPaginas={totalPaginas} irA={irA} next={next} prev={prev} />
            </div>

            {/* FAB Nuevo — mobile */}
            <BotonFlotante onClick={abrirNuevo} label="Nuevo producto" />

            {/* Modales */}
            {modalPrecio && (
                <ModalPrecioMasivo
                    cantidadSeleccionados={seleccionados.size}
                    ganancia={gananciamasiva} markup={markupMasivo} impuestos={impuestosMasivo}
                    onGananciaChange={setGananciaMasiva} onMarkupChange={setMarkupMasivo} onImpuestosChange={setImpuestosMasivo}
                    onAplicar={aplicarPrecioMasivo} onCerrar={() => setModalPrecio(false)}
                />
            )}
            <RepuestoModal isOpen={modalAbierto} onClose={cerrarModal} onGuardado={cargarProductos} repuestoEdicion={productoEdicion} />
            <StockQuickSheet isOpen={stockSheetOpen} onClose={() => setStockSheetOpen(false)} repuestos={productos} onActualizado={cargarProductos} />
        </div>
    );
}
