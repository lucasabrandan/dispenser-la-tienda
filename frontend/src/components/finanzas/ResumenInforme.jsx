import React from 'react';
import { useMontos } from '../../context/MontosContext';
import { totalesInforme, balanceInforme, textoDiferencia } from '../../utils/pdf/informeTecnico';

// Resumen del informe por técnico (9-oct-2026): plata de los trabajos marcados y
// las cuentas con el técnico (quién cobró y la diferencia).
const pesos = v => `$ ${Math.round(Number(v || 0)).toLocaleString('es-AR')}`;

function Fila({ label, valor, fuerte = false, dorado = false }) {
    return (
        <div className="flex items-baseline justify-between gap-3 py-1">
            <span className={`text-caption ${fuerte ? 'font-black text-ink' : 'text-secondary'}`}>{label}</span>
            <span className={`text-body tabular-nums ${fuerte ? 'font-black' : 'font-bold'} ${dorado ? 'text-[#A16207] dark:text-[#F0A500]' : 'text-ink'}`}>{valor}</span>
        </div>
    );
}

export default function ResumenInforme({ inf, trabajos, conGanancia }) {
    const { ocultar } = useMontos();
    const $ = v => (ocultar ? '••••' : pesos(v));
    const tot = totalesInforme(trabajos);
    const b = balanceInforme(trabajos, inf.rendido);
    const nom = (inf.tecnicoNombre || 'Técnico').split(' ')[0];
    const tarjetas = [
        { label: 'Trabajos', valor: tot.cantidad },
        { label: 'Total', valor: $(tot.total) },
        { label: `Parte ${nom}`, valor: $(tot.parteTecnico) },
        ...(conGanancia ? [{ label: `Ganancia · ${tot.margen.toFixed(0)}%`, valor: $(tot.ganancia), dorado: true }] : []),
    ];
    return (
        <div className="space-y-3">
            <div className={`grid gap-2 ${conGanancia ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-3'}`}>
                {tarjetas.map(t => (
                    <div key={t.label} className="rounded-2xl bg-panel p-3">
                        <p className="text-label font-black text-muted uppercase tracking-wider truncate">{t.label}</p>
                        <p className={`text-body-lg font-black tabular-nums ${t.dorado ? 'text-[#A16207] dark:text-[#F0A500]' : 'text-ink'}`}>{t.valor}</p>
                    </div>
                ))}
            </div>

            {conGanancia && (
                <div className="rounded-2xl bg-panel px-4 py-2.5 divide-y divide-black/[0.05] dark:divide-white/[0.05]">
                    <Fila label="Productos (precio de venta)" valor={$(tot.productosVenta)} />
                    <Fila label={`Impuestos ${inf.porcentajeImpuestos}% (con factura)`} valor={$(tot.impuestos)} />
                    <Fila label="Mano de obra neta" valor={$(tot.manoObraNeta)} />
                    <Fila label={`Parte del negocio (${100 - inf.porcentajeTecnico}%)`} valor={$(tot.parteNegocio)} />
                    <Fila label="Ganancia en productos (venta − costo)" valor={$(tot.margenProductos)} />
                    <Fila label="Ganancia del negocio" valor={$(tot.ganancia)} fuerte dorado />
                    {tot.costoIncompleto && <p className="py-1.5 text-caption text-muted">* Hay productos sin costo cargado: la ganancia real puede ser un poco menor.</p>}
                </div>
            )}

            <div className="rounded-2xl bg-panel px-4 py-2.5">
                <p className="text-label font-black text-muted uppercase tracking-widest pt-1">Cuentas con {nom}</p>
                <div className="divide-y divide-black/[0.05] dark:divide-white/[0.05]">
                    <Fila label={`Cobró ${nom} (la tiene él)`} valor={$(b.cobroTecnico)} />
                    <Fila label="Te pagaron a vos" valor={$(b.cobroNegocio)} />
                    {b.sinDato > 0 && <Fila label="Cobrado sin saber quién (va como tuyo)" valor={$(b.sinDato)} />}
                    {b.sinCobrar > 0 && <Fila label="Sin cobrar todavía (no entra)" valor={$(b.sinCobrar)} />}
                    {b.archivadosDudosos > 0 && <Fila label="Archivados: ¿se cobraron? (no entran)" valor={$(b.archivadosDudosos)} />}
                    <Fila label={`Le corresponde a ${nom} de lo cobrado`} valor={$(b.parteTecnico)} />
                    {b.rendido > 0 && <Fila label={`Ya te rindió ${nom}`} valor={$(b.rendido)} />}
                    <Fila label={textoDiferencia(b, nom)} valor={$(Math.abs(b.diferencia))} fuerte dorado />
                </div>
                {b.hayDudosos && <p className="pb-1.5 text-caption text-muted">Marcá en cada trabajo quién cobró (o si se cobró, en los archivados) para que la cuenta sea exacta.</p>}
            </div>
        </div>
    );
}
