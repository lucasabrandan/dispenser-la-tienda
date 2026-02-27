import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from 'react-hot-toast';

export const generarRemitoPDFPremium = ({ 
    esPresupuesto, cliente, sede, tecnico, ticketItems, subtotalTicket, valorDescuento, totalFinal 
}) => {
    
    if (!cliente || ticketItems.length === 0) {
        return toast.error("⚠️ El ticket está vacío o falta cliente.");
    }

    const doc = new jsPDF();
    const BRAND_RED = [229, 77, 66]; // Rojo corporativo
    
    // 1. FRANJA SUPERIOR
    doc.setFillColor(...BRAND_RED); 
    doc.rect(0, 0, 210, 30, 'F');
    
    doc.setFontSize(24);
    doc.setTextColor(255, 255, 255);
    doc.setFont(undefined, 'bold');
    doc.text("DISPENSER LA TIENDA", 14, 20);
    
    doc.setFontSize(12);
    doc.setFont(undefined, 'normal');
    doc.text(esPresupuesto ? "PRESUPUESTO TÉCNICO" : "REMITO DE SERVICIO", 200, 20, { align: "right" });

    // 2. BLOQUE DE DATOS
    let finalY = 40;
    doc.setDrawColor(200, 200, 200);
    doc.setFillColor(250, 250, 250);
    doc.roundedRect(14, finalY, 182, 35, 3, 3, 'FD');

    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    const fecha = new Date().toLocaleDateString('es-AR');
    doc.text(`Fecha: ${fecha}`, 18, finalY + 8);
    doc.text(`Técnico: ${tecnico}`, 100, finalY + 8);
    
    doc.setDrawColor(220, 220, 220);
    doc.line(18, finalY + 12, 192, finalY + 12); 

    doc.setTextColor(40, 40, 40);
    doc.setFont(undefined, 'bold');
    doc.text(`Cliente: ${cliente.nombre} ${cliente.cuilDni ? `(${cliente.cuilDni})` : ''}`, 18, finalY + 20);
    doc.setFont(undefined, 'normal');
    doc.text(`Ubicación: ${sede?.direccion || 'General'} (${sede?.nombreSede || ''})`, 18, finalY + 26);
    doc.text(`Contacto: ${cliente.telefono || '-'} | ${cliente.email || '-'}`, 18, finalY + 32);
    
    finalY += 45;

    // 3. BUCLE DE EQUIPOS
    ticketItems.forEach((item, index) => {
        if (finalY > 230) { doc.addPage(); finalY = 20; }
        const eq = item.equipoData || {};
        
        doc.setFillColor(255, 245, 245); 
        doc.setDrawColor(...BRAND_RED); 
        doc.rect(14, finalY, 182, 10, 'FD');
        
        doc.setFontSize(11);
        doc.setTextColor(...BRAND_RED);
        doc.setFont(undefined, 'bold');
        doc.text(`EQUIPO ${index + 1} | Dispenser ${eq.marca || ''} (SN: ${item.equipoSerial})`, 18, finalY + 7);
        
        finalY += 15;
        
        doc.setTextColor(60, 60, 60);
        doc.setFontSize(10);
        doc.text("Trabajo Realizado:", 14, finalY);
        doc.setFont(undefined, 'normal');
        const lines = doc.splitTextToSize(item.trabajo || 'Mantenimiento preventivo.', 180);
        doc.text(lines, 14, finalY + 5);
        finalY += (lines.length * 5) + 6;

        if (item.repuestosUsados?.length > 0) {
            autoTable(doc, {
                head: [["Cod.", "Repuesto", "Importe"]],
                body: item.repuestosUsados.map(r => [r.sku || '-', r.nombre, `$ ${Number(r.precio).toLocaleString('es-AR')}`]),
                startY: finalY,
                theme: 'grid',
                headStyles: { fillColor: BRAND_RED }
            });
            finalY = doc.lastAutoTable.finalY + 8;
        }

        doc.setFontSize(10);
        doc.text(`Subtotal Equipo: $ ${item.subtotalCobrado.toLocaleString('es-AR')}`, 140, finalY);
        finalY += 12;

        if (item.fotoAntes || item.fotoDespues) {
            const ancho = 75; const alto = 55;
            if (item.fotoAntes) {
                try { doc.addImage(item.fotoAntes, 'JPEG', 14, finalY, ancho, alto); } catch(e){}
            }
            if (item.fotoDespues) {
                const posX = item.fotoAntes ? 105 : 14;
                try { doc.addImage(item.fotoDespues, 'JPEG', posX, finalY, ancho, alto); } catch(e){}
            }
            finalY += alto + 10;
        }
    });

    // 4. TOTALES
    if (finalY > 250) { doc.addPage(); finalY = 20; }
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text(`TOTAL FINAL: $ ${totalFinal.toLocaleString('es-AR')}`, 140, finalY + 10, { align: 'right' });

    doc.save(`${esPresupuesto ? 'Presupuesto' : 'Remito'}_${cliente.nombre}.pdf`);
};