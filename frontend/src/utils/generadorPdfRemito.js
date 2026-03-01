import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from 'react-hot-toast';

export const generarRemitoPDFPremium = ({ 
    esPresupuesto, cliente, sede, tecnico, ticketItems, totalFinal, fechaServicio 
}) => {
    
    if (!cliente || ticketItems.length === 0) {
        return toast.error("⚠️ Error: Datos insuficientes para generar el PDF.");
    }

    const doc = new jsPDF();
    const BRAND_RED = [229, 77, 66]; // Rojo Técnica
    const BRAND_GREEN = [0, 128, 0]; // Verde Venta
    
    // 🛡️ FIX FECHA: Evita el "Invalid Date"
    const procesarFecha = (f) => {
        try {
            if (!f) return new Date().toLocaleDateString('es-AR');
            // Si viene YYYY-MM-DD le sumamos la hora para que el fuso horario no lo mueva de día
            const d = new Date(f.includes('T') ? f : `${f}T12:00:00`);
            return isNaN(d.getTime()) ? new Date().toLocaleDateString('es-AR') : d.toLocaleDateString('es-AR');
        } catch (e) {
            return new Date().toLocaleDateString('es-AR');
        }
    };
    const fechaFinal = procesarFecha(fechaServicio);

    // 🛡️ FIX MODO INTELIGENTE: Si hay S/N real, es técnica (Rojo)
    const esModoTecnico = ticketItems.some(it => it.equipoSerial && it.equipoSerial !== "MOSTRADOR");
    const colorModo = esModoTecnico ? BRAND_RED : BRAND_GREEN;
    const tituloModo = esModoTecnico ? "REMITO DE SERVICIO TÉCNICO" : "VENTA DE PRODUCTOS / INSUMOS";

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
    doc.text(`Fecha: ${fechaFinal}`, 18, finalY + 8);
    if(esModoTecnico) doc.text(`Técnico: ${tecnico || 'Marcos'}`, 100, finalY + 8);
    
    doc.line(18, finalY + 12, 192, finalY + 12); 

    doc.setFont(undefined, 'bold');
    doc.text(`CLIENTE: ${cliente.nombre?.toUpperCase() || 'PARTICULAR'}`, 18, finalY + 20);
    doc.setFont(undefined, 'normal');
    doc.text(`Ubicación: ${sede?.nombreSede || 'S/D'} - ${sede?.direccion || 'Mostrador'}`, 18, finalY + 26);
    doc.text(`Contacto: ${cliente.telefono || '-'} | ${cliente.email || '-'}`, 18, finalY + 32);
    
    finalY += 45;

    // 3. DESGLOSE DE ÍTEMS
    ticketItems.forEach((item, index) => {
        if (finalY > 230) { doc.addPage(); finalY = 20; }
        
        // --- MODO TÉCNICO ---
        if (item.equipoSerial && item.equipoSerial !== "MOSTRADOR") {
            doc.setFillColor(240, 240, 240); 
            doc.rect(14, finalY, 182, 10, 'F');
            doc.setFontSize(11);
            doc.setTextColor(...BRAND_RED);
            doc.setFont(undefined, 'bold');
            doc.text(`EQUIPO ${index + 1} | S/N: ${item.equipoSerial}`, 18, finalY + 7);
            
            finalY += 15;
            doc.setTextColor(0, 0, 0);
            doc.setFontSize(10);
            doc.text("Descripción del Trabajo:", 14, finalY);
            doc.setFont(undefined, 'normal');
            
            const textoTrabajo = item.trabajo || item.trabajoRealizado || 'Mantenimiento General.';
            const lines = doc.splitTextToSize(textoTrabajo, 180);
            doc.text(lines, 14, finalY + 5);
            finalY += (lines.length * 5) + 6;

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
            doc.text(`Subtotal Equipo: $ ${Number(item.totalCalculado || item.costo).toLocaleString('es-AR')}`, 196, finalY, { align: 'right' });
            finalY += 15;
        } 
        // --- MODO VENTA ---
        else {
            const filasVenta = [];
            item.repuestosUsados?.forEach(r => {
                filasVenta.push([
                    r.nombre,
                    r.cantidad,
                    `$ ${Number(r.precio).toLocaleString('es-AR')}`,
                    `$ ${Number(r.subtotal).toLocaleString('es-AR')}`
                ]);
            });

            if (item.costoExtra > 0) {
                filasVenta.push(["COSTO DE ENVÍO / EXTRA", "1", "-", `$ ${Number(item.costoExtra).toLocaleString('es-AR')}`]);
            }

            autoTable(doc, {
                startY: finalY,
                head: [["Producto / Insumo", "Cant.", "Precio Unit.", "Subtotal"]],
                body: filasVenta,
                theme: 'striped',
                headStyles: { fillColor: BRAND_GREEN },
                columnStyles: { 1: { halign: 'center' }, 2: { halign: 'right' }, 3: { halign: 'right' } }
            });
            finalY = doc.lastAutoTable.finalY + 15;
        }
    });

    // 4. TOTAL FINAL (CAJA NEGRA)
    if (finalY > 260) { doc.addPage(); finalY = 20; }
    doc.setFillColor(0, 0, 0);
    doc.rect(130, finalY, 66, 12, 'F');
    doc.setFontSize(14);
    doc.setTextColor(255, 255, 255);
    doc.setFont(undefined, 'bold');
    doc.text(`TOTAL: $ ${Number(totalFinal).toLocaleString('es-AR')}`, 192, finalY + 8, { align: 'right' });

    // 5. PIE DE PÁGINA
    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    const notaFooter = esModoTecnico 
        ? "Garantía de servicio: 30 días sobre mano de obra. Repuestos según fabricante."
        : "Presupuesto válido por 7 días. Precios sujetos a variación sin previo aviso.";
    doc.text(notaFooter, 105, 285, { align: 'center' });

    doc.save(`${esModoTecnico ? 'Service' : 'Venta'}_${cliente.nombre || 'Remito'}.pdf`);
};