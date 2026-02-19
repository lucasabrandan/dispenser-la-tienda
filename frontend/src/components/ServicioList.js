import React from 'react';

export default function ServicioList({ servicios }) {
    if (!servicios || servicios.length === 0) return <p style={{textAlign:'center', padding:'20px'}}>No hay registros contables.</p>;
    return (
        <div style={{ marginTop: '30px', background: '#fff', padding: '20px', borderRadius: '12px' }}>
            <h2 style={{ color: '#2e7d32' }}>📊 Historial de Visitas y Caja</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                    <tr style={{ background: '#2e7d32', color: '#fff' }}>
                        <th style={{ padding: '12px' }}>Sede / Fecha</th>
                        <th style={{ padding: '12px' }}>Equipo</th>
                        <th style={{ padding: '12px', textAlign: 'right' }}>Bruto</th>
                        <th style={{ padding: '12px', textAlign: 'right' }}>Desc.</th>
                        <th style={{ padding: '12px', textAlign: 'right' }}>NETO</th>
                        <th style={{ padding: '12px' }}>Medio</th>
                    </tr>
                </thead>
                <tbody>
                    {servicios.map(s => (
                        <React.Fragment key={s.id}>
                            {s.items.map((item, idx) => (
                                <tr key={`${s.id}-${idx}`} style={{ borderBottom: '1px solid #eee' }}>
                                    <td style={{ padding: '10px' }}>{idx === 0 ? <strong>{s.nombreSede}<br/><small style={{color:'#999'}}>{s.fechaServicio}</small></strong> : ''}</td>
                                    <td style={{ padding: '10px' }}>{item.numeroSerie}</td>
                                    <td style={{ padding: '10px', textAlign: 'right', color: '#888' }}>${item.costo?.toLocaleString()}</td>
                                    <td style={{ padding: '10px', textAlign: 'right', color: '#d32f2f' }}>{item.descuento > 0 ? `-$${item.descuento.toLocaleString()}` : '--'}</td>
                                    <td style={{ padding: '10px', textAlign: 'right', fontWeight: 'bold', color: '#1b5e20' }}>${(item.costo - item.descuento).toLocaleString('es-AR')}</td>
                                    <td style={{ padding: '10px', textAlign: 'center', fontSize: '0.8em' }}>{item.metodoPago}</td>
                                </tr>
                            ))}
                        </React.Fragment>
                    ))}
                </tbody>
            </table>
        </div>
    );
}