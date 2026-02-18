import React from 'react';

export default function ServicioList({ servicios }) {
    if (!servicios || servicios.length === 0) {
        return <p style={{ textAlign: 'center', color: '#666', marginTop: '20px' }}>No hay visitas registradas aún.</p>;
    }

    return (
        <section style={{ marginTop: '20px' }}>
            <h2 style={{ borderBottom: '2px solid #e65100', paddingBottom: '10px', color: '#333' }}>Historial de Visitas</h2>
            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
                    <thead>
                        <tr style={{ background: '#333', color: 'white', textAlign: 'left' }}>
                            <th style={{ padding: '12px', border: '1px solid #ddd' }}>Fecha</th>
                            <th style={{ padding: '12px', border: '1px solid #ddd' }}>Sede</th>
                            <th style={{ padding: '12px', border: '1px solid #ddd' }}>Técnico</th>
                            <th style={{ padding: '12px', border: '1px solid #ddd' }}>Trabajo realizado</th>
                            <th style={{ padding: '12px', border: '1px solid #ddd' }}>Costo</th>
                        </tr>
                    </thead>
                    <tbody>
                        {servicios.map((s) => (
                            <React.Fragment key={s.id}>
                                {s.items && s.items.map((item, idx) => (
                                    <tr key={`${s.id}-${idx}`} style={{ background: idx % 2 === 0 ? '#fff' : '#f9f9f9' }}>
                                        <td style={{ padding: '12px', border: '1px solid #ddd' }}>{idx === 0 ? s.fecha : ''}</td>
                                        <td style={{ padding: '12px', border: '1px solid #ddd', fontWeight: 'bold' }}>{idx === 0 ? s.nombreSede : ''}</td>
                                        <td style={{ padding: '12px', border: '1px solid #ddd' }}>
                                            <span style={{ 
                                                fontWeight: 'bold', 
                                                color: item.tecnico === 'Marcos' ? '#2e7d32' : '#1565c0',
                                                background: item.tecnico === 'Marcos' ? '#e8f5e9' : '#e3f2fd',
                                                padding: '4px 8px',
                                                borderRadius: '4px'
                                            }}>
                                                {item.tecnico || '---'}
                                            </span>
                                        </td>
                                        <td style={{ padding: '12px', border: '1px solid #ddd' }}>
                                            <strong>{item.numeroSerie}:</strong> {item.trabajoRealizado}
                                        </td>
                                        <td style={{ padding: '12px', border: '1px solid #ddd', color: '#d32f2f', fontWeight: 'bold' }}>
                                            ${item.costo?.toLocaleString('es-AR') || '0'}
                                        </td>
                                    </tr>
                                ))}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>
        </section>
    );
}