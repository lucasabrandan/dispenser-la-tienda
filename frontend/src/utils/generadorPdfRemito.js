import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from 'react-hot-toast';
 
export const generarRemitoPDFPremium = ({ 
    esPresupuesto, cliente, sede, tecnico, ticketItems, totalFinal, fechaServicio,
    descuentoPorcentaje = 0  // ← NUEVO
}) => {
    
    if (!cliente || ticketItems.length === 0) {
        return toast.error("⚠️ Error: Datos insuficientes para generar el PDF.");
    }
 
    const doc = new jsPDF();
    const BRAND_RED = [229, 77, 66]; 
    const BRAND_GREEN = [0, 128, 0]; 
    
    const procesarFecha = (f) => {
        try {
            if (!f) return new Date().toLocaleDateString('es-AR');
            const d = new Date(f.includes('T') ? f : `${f}T12:00:00`);
            return isNaN(d.getTime()) ? new Date().toLocaleDateString('es-AR') : d.toLocaleDateString('es-AR');
        } catch (e) {
            return new Date().toLocaleDateString('es-AR');
        }
    };
    const fechaFinal = procesarFecha(fechaServicio);
 
    const esModoTecnico = ticketItems.some(it => it.equipoSerial && it.equipoSerial !== "MOSTRADOR");
    const colorModo = esModoTecnico ? BRAND_RED : BRAND_GREEN;
    const tituloModo = esModoTecnico ? "REMITO DE SERVICIO TÉCNICO" : "VENTA DE PRODUCTOS / INSUMOS";
 
    // Calcular subtotal bruto (sin descuento)
    const subtotalBruto = ticketItems.reduce((a, b) => a + (parseFloat(b.totalCalculado) || parseFloat(b.costo) || 0), 0);
    const pctDesc = parseFloat(descuentoPorcentaje) || 0;
    const montoDescuento = pctDesc > 0 ? (subtotalBruto * pctDesc / 100) : 0;
    const totalConDescuento = subtotalBruto - montoDescuento;
 
    // 1. FRANJA SUPERIOR
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
    doc.roundedRect(14, finalY, 182, 40, 3, 3, 'FD');
 
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text(`Fecha: ${fechaFinal}`, 18, finalY + 7);
    if (esModoTecnico) doc.text(`Técnico: ${tecnico || 'Marcos'}`, 100, finalY + 7);
    
    doc.line(18, finalY + 11, 192, finalY + 11); 
 
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.setFont(undefined, 'bold');
    doc.text(`CLIENTE: ${cliente.nombre?.toUpperCase() || 'PARTICULAR'}`, 18, finalY + 18);
    
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(80, 80, 80);
    doc.text(`CUIT/DNI: ${cliente.cuilDni || '-'}  |  IVA: ${cliente.condicionIva || 'CONSUMIDOR FINAL'}`, 18, finalY + 24);
    doc.text(`Ubicación: ${sede?.nombreSede || 'S/D'} - ${sede?.direccion || 'Mostrador'}`, 18, finalY + 30);
    doc.text(`Contacto: ${cliente.telefono || '-'} | ${cliente.email || '-'}`, 18, finalY + 36);
    
    finalY += 50;
 
    // 3. DESGLOSE DE ÍTEMS
    ticketItems.forEach((item, index) => {
        if (finalY > 230) { doc.addPage(); finalY = 20; }
        
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
        } else {
            const filasVenta = [];
            item.repuestosUsados?.forEach(r => {
                filasVenta.push([
                    r.nombre,
                    r.cantidad,
                    `$ ${Number(r.precio).toLocaleString('es-AR')}`,
                    `$ ${Number(r.subtotal).toLocaleString('es-AR')}`
                ]);
            });
 
            if (item.costoExtra !== null && item.costoExtra !== undefined && item.costoExtra !== "") {
                const valorEnvio = Number(item.costoExtra);
                filasVenta.push([
                    valorEnvio === 0 ? "ENTREGA Y LOGÍSTICA (PROMO)" : "COSTO DE ENVÍO / EXTRA",
                    "1", "-",
                    valorEnvio === 0 ? "¡SIN CARGO!" : `$ ${valorEnvio.toLocaleString('es-AR')}`
                ]);
            }
 
            autoTable(doc, {
                startY: finalY,
                head: [["Producto / Insumo", "Cant.", "Precio Unit.", "Subtotal"]],
                body: filasVenta,
                theme: 'striped',
                headStyles: { fillColor: BRAND_GREEN },
                styles: { fontSize: 9 },
                columnStyles: { 1: { halign: 'center' }, 2: { halign: 'right' }, 3: { halign: 'right' } },
                didParseCell: function(data) {
                    if (data.cell.text[0] === "¡SIN CARGO!") {
                        data.cell.styles.textColor = BRAND_GREEN;
                        data.cell.styles.fontStyle = 'bold';
                    }
                }
            });
            finalY = doc.lastAutoTable.finalY + 10;
        }
    });
 
    // 4. BLOQUE TOTALES — subtotal, descuento (si aplica), total final
    if (finalY > 250) { doc.addPage(); finalY = 20; }
 
    const bloqueAlto = pctDesc > 0 ? 36 : 14;
    doc.setFillColor(245, 245, 245);
    doc.rect(110, finalY, 86, bloqueAlto, 'F');
 
    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    doc.setFont(undefined, 'normal');
 
    if (pctDesc > 0) {
        // Subtotal sin descuento
        doc.text("Subtotal:", 115, finalY + 8);
        doc.text(`$ ${subtotalBruto.toLocaleString('es-AR')}`, 194, finalY + 8, { align: 'right' });
 
        // Descuento
        doc.setTextColor(...(esModoTecnico ? BRAND_RED : BRAND_GREEN));
        doc.text(`Descuento (${pctDesc}%):`, 115, finalY + 18);
        doc.text(`- $ ${montoDescuento.toLocaleString('es-AR')}`, 194, finalY + 18, { align: 'right' });
 
        // Línea separadora
        doc.setDrawColor(180, 180, 180);
        doc.line(115, finalY + 22, 194, finalY + 22);
 
        // Total final
        doc.setFillColor(0, 0, 0);
        doc.rect(110, finalY + 24, 86, 12, 'F');
        doc.setFontSize(13);
        doc.setTextColor(255, 255, 255);
        doc.setFont(undefined, 'bold');
        doc.text(`TOTAL: $ ${totalConDescuento.toLocaleString('es-AR')}`, 194, finalY + 32, { align: 'right' });
    } else {
        // Sin descuento — solo total
        doc.setFillColor(0, 0, 0);
        doc.rect(110, finalY, 86, 14, 'F');
        doc.setFontSize(13);
        doc.setTextColor(255, 255, 255);
        doc.setFont(undefined, 'bold');
        doc.text(`TOTAL: $ ${subtotalBruto.toLocaleString('es-AR')}`, 194, finalY + 9, { align: 'right' });
    }
 
    // 5. PIE DE PÁGINA
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    const notaFooter = esModoTecnico 
        ? "Garantía de servicio: 30 días sobre mano de obra. Repuestos según fabricante."
        : "Presupuesto válido por 7 días. Precios sujetos a variación sin previo aviso.";
    doc.text(notaFooter, 105, 285, { align: 'center' });
 
    doc.save(`${esModoTecnico ? 'Service' : 'Venta'}_${cliente.nombre || 'Remito'}.pdf`);
};