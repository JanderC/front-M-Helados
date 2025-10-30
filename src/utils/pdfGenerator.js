import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { formatCurrency, formatDate, formatNumber } from './formatters';

/**
 * Generar PDF de Reporte Mensual
 */
export const generarPDFReporteMensual = (reporte) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Encabezado
  doc.setFontSize(20);
  doc.setFont(undefined, 'bold');
  doc.text('Reporte Mensual de Ventas', pageWidth / 2, 20, { align: 'center' });
  
  doc.setFontSize(12);
  doc.setFont(undefined, 'normal');
  const nombreMes = obtenerNombreMes(reporte.mes);
  doc.text(`${nombreMes} ${reporte.anio}`, pageWidth / 2, 28, { align: 'center' });
  doc.text(`Generado: ${formatDate(reporte.fecha_generacion)}`, pageWidth / 2, 34, { align: 'center' });
  
  // Línea divisoria
  doc.setLineWidth(0.5);
  doc.line(15, 38, pageWidth - 15, 38);
  
  let yPos = 45;
  
  // Resumen General
  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.text('Resumen General', 15, yPos);
  yPos += 8;
  
  doc.setFontSize(11);
  doc.setFont(undefined, 'normal');
  
  const resumenData = [
    ['Total Ventas:', formatCurrency(reporte.total_ventas_usd, 'USD')],
    ['Total Ingresos:', formatCurrency(reporte.total_ingresos_usd, 'USD')],
    ['Total Egresos:', formatCurrency(reporte.total_egresos_usd, 'USD')],
    ['Utilidad Neta:', formatCurrency(reporte.utilidad_neta_usd, 'USD')],
    ['Número de Ventas:', reporte.numero_ventas.toString()]
  ];
  
  doc.autoTable({
    startY: yPos,
    head: [],
    body: resumenData,
    theme: 'plain',
    styles: { fontSize: 11, cellPadding: 3 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 60 },
      1: { halign: 'right' }
    },
    margin: { left: 15 }
  });
  
  yPos = doc.lastAutoTable.finalY + 15;
  
  // Productos Más Vendidos
  if (reporte.productos_mas_vendidos && reporte.productos_mas_vendidos.length > 0) {
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('Top 10 Productos Más Vendidos', 15, yPos);
    yPos += 5;
    
    const productosData = reporte.productos_mas_vendidos.map((p, idx) => [
      (idx + 1).toString(),
      p.nombre_producto,
      formatNumber(p.cantidad, 0)
    ]);
    
    doc.autoTable({
      startY: yPos,
      head: [['#', 'Producto', 'Cantidad']],
      body: productosData,
      theme: 'striped',
      styles: { fontSize: 10 },
      headStyles: { fillColor: [66, 139, 202], textColor: 255, fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 15, halign: 'center' },
        1: { cellWidth: 120 },
        2: { cellWidth: 40, halign: 'right' }
      },
      margin: { left: 15 }
    });
    
    yPos = doc.lastAutoTable.finalY + 15;
  }
  
  // Nueva página si es necesario
  if (yPos > 250) {
    doc.addPage();
    yPos = 20;
  }
  
  // Toppings Más Usados
  if (reporte.toppings_mas_usados && reporte.toppings_mas_usados.length > 0) {
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('Top 10 Toppings Más Usados', 15, yPos);
    yPos += 5;
    
    const toppingsData = reporte.toppings_mas_usados.map((t, idx) => [
      (idx + 1).toString(),
      t.nombre_topping,
      formatNumber(t.cantidad, 0)
    ]);
    
    doc.autoTable({
      startY: yPos,
      head: [['#', 'Topping', 'Cantidad']],
      body: toppingsData,
      theme: 'striped',
      styles: { fontSize: 10 },
      headStyles: { fillColor: [92, 184, 92], textColor: 255, fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 15, halign: 'center' },
        1: { cellWidth: 120 },
        2: { cellWidth: 40, halign: 'right' }
      },
      margin: { left: 15 }
    });
  }
  
  // Pie de página en todas las páginas
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(9);
    doc.setTextColor(150);
    doc.text(
      `Página ${i} de ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  }
  
  // Guardar PDF
  const nombreArchivo = `reporte_mensual_${nombreMes}_${reporte.anio}.pdf`;
  doc.save(nombreArchivo);
};

/**
 * Generar PDF de Productos Vendidos
 */
export const generarPDFProductosVendidos = (productos, fechaInicio, fechaFin) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Encabezado
  doc.setFontSize(18);
  doc.setFont(undefined, 'bold');
  doc.text('Reporte de Productos Vendidos', pageWidth / 2, 20, { align: 'center' });
  
  doc.setFontSize(11);
  doc.setFont(undefined, 'normal');
  doc.text(`Período: ${formatDate(fechaInicio)} - ${formatDate(fechaFin)}`, pageWidth / 2, 28, { align: 'center' });
  
  // Tabla de productos
  const productosData = productos.map((p, idx) => [
    (idx + 1).toString(),
    p.nombre_producto || p.nombre,
    p.nombre_categoria || p.categoria || 'N/A',
    formatNumber(p.cantidad_total || p.total_vendidos || p.cantidad || 0, 0),
    formatCurrency(p.ingresos_totales || p.total_ventas || 0, 'USD')
  ]);
  
  doc.autoTable({
    startY: 35,
    head: [['#', 'Producto', 'Categoría', 'Cantidad', 'Ingresos']],
    body: productosData,
    theme: 'striped',
    styles: { fontSize: 10 },
    headStyles: { fillColor: [66, 139, 202], textColor: 255, fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 15, halign: 'center' },
      1: { cellWidth: 70 },
      2: { cellWidth: 45 },
      3: { cellWidth: 30, halign: 'right' },
      4: { cellWidth: 35, halign: 'right' }
    }
  });
  
  // Total
  const totalIngresos = productos.reduce((sum, p) => 
    sum + parseFloat(p.ingresos_totales || p.total_ventas || 0), 0
  );
  
  const yPos = doc.lastAutoTable.finalY + 10;
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.text(`Total Ingresos: ${formatCurrency(totalIngresos, 'USD')}`, pageWidth - 15, yPos, { align: 'right' });
  
  doc.save(`reporte_productos_${formatDate(new Date())}.pdf`);
};

/**
 * Generar PDF de Toppings Usados
 */
export const generarPDFToppingsUsados = (toppings, fechaInicio, fechaFin) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Encabezado
  doc.setFontSize(18);
  doc.setFont(undefined, 'bold');
  doc.text('Reporte de Toppings Usados', pageWidth / 2, 20, { align: 'center' });
  
  doc.setFontSize(11);
  doc.setFont(undefined, 'normal');
  doc.text(`Período: ${formatDate(fechaInicio)} - ${formatDate(fechaFin)}`, pageWidth / 2, 28, { align: 'center' });
  
  // Tabla de toppings
  const toppingsData = toppings.map((t, idx) => [
    (idx + 1).toString(),
    t.nombre_topping || t.nombre,
    formatNumber(t.veces_usado || t.total_usados || t.cantidad || 0, 0),
    formatCurrency(t.ingresos_totales || t.total_ventas || 0, 'USD')
  ]);
  
  doc.autoTable({
    startY: 35,
    head: [['#', 'Topping', 'Veces Usado', 'Ingresos']],
    body: toppingsData,
    theme: 'striped',
    styles: { fontSize: 10 },
    headStyles: { fillColor: [92, 184, 92], textColor: 255, fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 20, halign: 'center' },
      1: { cellWidth: 100 },
      2: { cellWidth: 35, halign: 'right' },
      3: { cellWidth: 40, halign: 'right' }
    }
  });
  
  doc.save(`reporte_toppings_${formatDate(new Date())}.pdf`);
};

/**
 * Generar PDF de Inventario
 */
export const generarPDFInventario = (inventario) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Encabezado
  doc.setFontSize(18);
  doc.setFont(undefined, 'bold');
  doc.text('Reporte de Inventario', pageWidth / 2, 20, { align: 'center' });
  
  doc.setFontSize(11);
  doc.setFont(undefined, 'normal');
  doc.text(`Generado: ${formatDate(new Date())}`, pageWidth / 2, 28, { align: 'center' });
  
  let yPos = 35;
  
  // Toppings
  if (inventario.toppings && inventario.toppings.length > 0) {
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('Toppings', 15, yPos);
    yPos += 5;
    
    const toppingsData = inventario.toppings.map(t => [
      t.nombre_topping,
      formatNumber(t.stock_actual, 0),
      formatNumber(t.stock_minimo, 0),
      t.nivel_stock || 'N/A'
    ]);
    
    doc.autoTable({
      startY: yPos,
      head: [['Topping', 'Stock Actual', 'Stock Mínimo', 'Estado']],
      body: toppingsData,
      theme: 'striped',
      styles: { fontSize: 10 },
      headStyles: { fillColor: [66, 139, 202], textColor: 255, fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 80 },
        1: { cellWidth: 35, halign: 'right' },
        2: { cellWidth: 35, halign: 'right' },
        3: { cellWidth: 35, halign: 'center' }
      }
    });
    
    yPos = doc.lastAutoTable.finalY + 15;
  }
  
  // Materias Primas
  if (inventario.materias_primas && inventario.materias_primas.length > 0) {
    if (yPos > 200) {
      doc.addPage();
      yPos = 20;
    }
    
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('Materias Primas', 15, yPos);
    yPos += 5;
    
    const materiasData = inventario.materias_primas.map(m => [
      m.nombre_materia,
      formatNumber(m.cantidad_actual, 0),
      formatNumber(m.cantidad_minima, 0),
      m.nivel_stock || 'N/A'
    ]);
    
    doc.autoTable({
      startY: yPos,
      head: [['Materia Prima', 'Cantidad Actual', 'Cantidad Mínima', 'Estado']],
      body: materiasData,
      theme: 'striped',
      styles: { fontSize: 10 },
      headStyles: { fillColor: [92, 184, 92], textColor: 255, fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 80 },
        1: { cellWidth: 35, halign: 'right' },
        2: { cellWidth: 35, halign: 'right' },
        3: { cellWidth: 35, halign: 'center' }
      }
    });
  }
  
  doc.save(`reporte_inventario_${formatDate(new Date())}.pdf`);
};

/**
 * Función auxiliar para obtener nombre del mes
 */
const obtenerNombreMes = (numeroMes) => {
  const meses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  return meses[numeroMes - 1] || 'Mes Desconocido';
};