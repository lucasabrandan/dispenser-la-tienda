import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from 'react-hot-toast';

export const generarRemitoPDFPremium = ({ 
    esPresupuesto, cliente, sede, tecnico, ticketItems, totalFinal 
}) => {
    
    if (!cliente || ticketItems.length === 0) {
        return toast.error("⚠️ Error: Datos insuficientes para generar el PDF.");
    }

    const doc = new jsPDF();
    const BRAND_RED = [229, 77, 66]; // Rojo Técnica
    const BRAND_GREEN = [0, 128, 0]; // Verde Venta
    
    const colorModo = esPresupuesto ? BRAND_RED : BRAND_GREEN;
    const tituloModo = esPresupuesto ? "REMITO DE SERVICIO TÉCNICO" : "PRESUPUESTO DE VENTA / INSUMOS";

    // 1. FRANJA SUPERIOR DINÁMICA
    doc.setFillColor(...colorModo); 
    doc.rect(0, 0, 210, 30, 'F');
    doc.setFontSize(22);
    doc.setTextColor(255, 255, 255);
    doc.setFont(undefined, 'bold');
    doc.text("DISPENSER LA TIENDA", 14, 20);
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(tituloModo, 196, 20, { align: "right" });

    // 2. BLOQUE DE DATOS DEL CLIENTE
    let finalY = 40;
    doc.setDrawColor(200, 200, 200);
    doc.setFillColor(250, 250, 250);
    doc.roundedRect(14, finalY, 182, 35, 3, 3, 'FD');

    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    const fecha = new Date().toLocaleDateString('es-AR');
    doc.text(`Fecha: ${fecha}`, 18, finalY + 8);
    if(esPresupuesto) doc.text(`Técnico: ${tecnico || 'Marcos'}`, 100, finalY + 8);
    
    doc.line(18, finalY + 12, 192, finalY + 12); 

    doc.setFont(undefined, 'bold');
    doc.text(`CLIENTE: ${cliente.nombre?.toUpperCase() || 'PARTICULAR'}`, 18, finalY + 20);
    doc.setFont(undefined, 'normal');
    doc.text(`Ubicación: ${sede?.nombreSede || 'S/D'} - ${sede?.direccion || 'Mostrador'}`, 18, finalY + 26);
    doc.text(`Contacto: ${cliente.telefono || '-'} | ${cliente.email || '-'}`, 18, finalY + 32);
    
    finalY += 45;

    // --- MODO A: REPARACIÓN TÉCNICA (DESGLOSE POR CADA EQUIPO) ---
    if (esPresupuesto) {
        ticketItems.forEach((item, index) => {
            if (finalY > 230) { doc.addPage(); finalY = 20; }
            
            // Título de la máquina
            doc.setFillColor(240, 240, 240); 
            doc.rect(14, finalY, 182, 10, 'F');
            doc.setFontSize(11);
            doc.setTextColor(...BRAND_RED);
            doc.setFont(undefined, 'bold');
            doc.text(`EQUIPO ${index + 1} | S/N: ${item.equipoSerial || 'N/A'}`, 18, finalY + 7);
            
            finalY += 15;
            doc.setTextColor(0, 0, 0);
            doc.setFontSize(10);
            doc.text("Descripción del Trabajo:", 14, finalY);
            doc.setFont(undefined, 'normal');
            const lines = doc.splitTextToSize(item.trabajo || 'Mantenimiento General.', 180);
            doc.text(lines, 14, finalY + 5);
            finalY += (lines.length * 5) + 6;

            // Tabla con Mano de Obra del equipo + sus repuestos
            const bodyTabla = [
                ["Mano de Obra / Servicio Técnico", "1", `$ ${Number(item.costoExtra || 0).toLocaleString('es-AR')}`]
            ];

            if (item.repuestosUsados?.length > 0) {
                item.repuestosUsados.forEach(r => {
                    bodyTabla.push([r.nombre, r.cantidad.toString(), `$ ${Number(r.subtotal).toLocaleString('es-AR')}`]);
                });
            }

            autoTable(doc, {
                startY: finalY,
                head: [["Detalle del Servicio", "Cant.", "Subtotal"]],
                body: bodyTabla,
                theme: 'grid',
                headStyles: { fillColor: [80, 80, 80] },
                styles: { fontSize: 9 },
                columnStyles: { 1: { halign: 'center' }, 2: { halign: 'right' } }
            });

            finalY = doc.lastAutoTable.finalY + 8;
            doc.setFont(undefined, 'bold');
            doc.text(`Subtotal Equipo: $ ${Number(item.totalCalculado).toLocaleString('es-AR')}`, 196, finalY, { align: 'right' });
            finalY += 15;
        });
    } 
    // --- MODO B: VENTA DE INSUMOS (TABLA UNIFICADA CON ENVÍO) ---
    else {
        let totalEnvio = 0;
        const filasProductos = [];

        ticketItems.forEach(item => {
            totalEnvio += Number(item.costoExtra || 0);
            item.repuestosUsados?.forEach(r => {
                filasProductos.push([
                    r.nombre,
                    r.cantidad,
                    `$ ${Number(r.precio).toLocaleString('es-AR')}`,
                    `$ ${Number(r.subtotal).toLocaleString('es-AR')}`
                ]);
            });
        });

        autoTable(doc, {
            startY: finalY,
            head: [["Producto / Insumo", "Cant.", "Precio Unit.", "Subtotal"]],
            body: filasProductos,
            theme: 'striped',
            headStyles: { fillColor: BRAND_GREEN },
            columnStyles: {
                1: { halign: 'center' },
                2: { halign: 'right' },
                3: { halign: 'right' }
            }
        });

        finalY = doc.lastAutoTable.finalY + 10;

        // Fila de Envío
        doc.setFontSize(11);
        doc.setTextColor(0, 0, 0);
        doc.setFont(undefined, 'bold');
        const envioTexto = totalEnvio > 0 ? `$ ${totalEnvio.toLocaleString('es-AR')}` : "¡GRATIS!";
        doc.text("COSTO DE ENVÍO:", 150, finalY, { align: 'right' });
        doc.text(envioTexto, 196, finalY, { align: 'right' });
        finalY += 10;
    }

    // 4. TOTAL FINAL (CAJA NEGRA)
    if (finalY > 260) { doc.addPage(); finalY = 20; }
    doc.setFillColor(0, 0, 0);
    doc.rect(130, finalY, 66, 12, 'F');
    doc.setFontSize(14);
    doc.setTextColor(255, 255, 255);
    doc.setFont(undefined, 'bold');
    doc.text(`TOTAL: $ ${totalFinal.toLocaleString('es-AR')}`, 192, finalY + 8, { align: 'right' });

    // 5. PIE DE PÁGINA COMERCIAL
    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    const notaFooter = esPresupuesto 
        ? "Garantía de servicio: 30 días sobre mano de obra. Repuestos según fabricante."
        : "Presupuesto válido por 7 días. Precios sujetos a variación sin previo aviso.";
    doc.text(notaFooter, 105, 285, { align: 'center' });

    doc.save(`${esPresupuesto ? 'Service' : 'Venta'}_${cliente.nombre || 'Remito'}.pdf`);
};