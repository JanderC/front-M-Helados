import { useState, useEffect, useCallback } from 'react';
import { Row, Col, Card, Button, Form, Badge, Spinner, Modal } from 'react-bootstrap';
import { reportesService } from '../../api/services/reportesService';
import { formatCurrency } from '../../utils/formatters';
import {
  generarPDFReporteMensual,
  generarPDFProductosVendidos,
  generarPDFToppingsUsados,
  generarPDFInventario
} from '../../utils/pdfGenerator';
import { toast } from 'react-toastify';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale,
  BarElement, ArcElement,
  Title, Tooltip, Legend
} from 'chart.js';
import { Bar, Pie } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

/* ─── helpers ─────────────────────────────────────── */
const num = (v) => parseFloat(v)  || 0;
const int = (v) => parseInt(v)    || 0;
const arr = (v) => Array.isArray(v) ? v : [];

/** Extrae el array de datos de cualquier estructura que devuelva el backend */
const extractArray = (raw, tipo) => {
  if (!raw) return [];
  // ya es array directo
  if (Array.isArray(raw)) return raw;

  // objeto con clave conocida según tipo
  const claves = {
    'productos-vendidos': ['productos', 'data', 'items'],
    'toppings-usados':    ['toppings', 'data', 'items'],
    'ventas-categoria':   ['categorias', 'ventas', 'data', 'items'],
    'inventario':         null // inventario es objeto especial
  };

  if (tipo === 'inventario') return raw; // devolver objeto tal cual

  const keys = claves[tipo] || ['data', 'items'];
  for (const k of keys) {
    if (raw[k] && Array.isArray(raw[k])) return raw[k];
  }
  // fallback: primer valor que sea array
  for (const v of Object.values(raw)) {
    if (Array.isArray(v) && v.length > 0) return v;
  }
  return [];
};

/* ─── Paleta de colores de la marca ───────────────── */
const BRAND_COLORS = [
  'rgba(123,47,190,0.75)',
  'rgba(77,207,189,0.75)',
  'rgba(245,158,11,0.75)',
  'rgba(239,68,68,0.75)',
  'rgba(59,130,246,0.75)',
  'rgba(34,197,94,0.75)',
  'rgba(168,85,247,0.75)',
  'rgba(249,115,22,0.75)',
];
const BRAND_BORDERS = BRAND_COLORS.map(c => c.replace('0.75', '1'));

/* ─── Fila de tabla genérica ─────────────────────── */
const TipoReporteConfig = {
  'productos-vendidos': {
    label: 'Productos Más Vendidos',
    icon:  'bi-bag-check-fill',
    color: '#7B2FBE',
    chartType: 'pie',
    headers: ['#', 'Producto', 'Categoría', 'Cantidad', 'Ingresos (USD)'],
    getLabel:  (item) => item.nombre_producto || item.nombre || '—',
    getCount:  (item) => int(item.cantidad_total || item.total_vendidos || item.cantidad),
    renderRow: (item, idx) => [
      idx + 1,
      <strong>{item.nombre_producto || item.nombre || '—'}</strong>,
      <span className="rep-badge cat">{item.nombre_categoria || item.categoria || '—'}</span>,
      <span className="rep-count">{int(item.cantidad_total || item.total_vendidos || item.cantidad)}</span>,
      <strong style={{ color: '#15803d' }}>{formatCurrency(num(item.ingresos_totales || item.total_ventas), 'USD')}</strong>
    ]
  },
  'toppings-usados': {
    label: 'Toppings Más Usados',
    icon:  'bi-stars',
    color: '#b45309',
    chartType: 'pie',
    headers: ['#', 'Topping', 'Veces Usado', 'Ingresos (USD)'],
    getLabel:  (item) => item.nombre_topping || item.nombre || '—',
    getCount:  (item) => int(item.veces_usado || item.total_usados || item.cantidad),
    renderRow: (item, idx) => [
      idx + 1,
      <strong>{item.nombre_topping || item.nombre || '—'}</strong>,
      <span className="rep-count">{int(item.veces_usado || item.total_usados || item.cantidad)}</span>,
      <strong style={{ color: '#15803d' }}>{formatCurrency(num(item.ingresos_totales || item.total_ventas), 'USD')}</strong>
    ]
  },
  'ventas-categoria': {
    label: 'Ventas por Categoría',
    icon:  'bi-grid-fill',
    color: '#0369a1',
    chartType: 'bar',
    headers: ['Categoría', 'Productos Vendidos', 'Total (USD)'],
    getLabel:  (item) => item.nombre_categoria || item.categoria || '—',
    getCount:  (item) => num(item.ingresos_totales || item.total_ventas),
    renderRow: (item, idx) => [
      <strong>{item.nombre_categoria || item.categoria || '—'}</strong>,
      <span className="rep-count">{int(item.productos_vendidos || item.cantidad)}</span>,
      <strong style={{ color: '#15803d' }}>{formatCurrency(num(item.ingresos_totales || item.total_ventas), 'USD')}</strong>
    ]
  },
  'inventario': {
    label: 'Inventario',
    icon:  'bi-box-seam-fill',
    color: '#16a34a',
    chartType: null,
    headers: [],
    getLabel:  () => '',
    getCount:  () => 0,
    renderRow: () => []
  }
};

/* ─── Chip de nivel stock ────────────────────────── */
const StockBadge = ({ nivel }) => {
  const map = {
    BAJO:  { bg: 'rgba(239,68,68,0.1)',   color: '#dc2626', border: 'rgba(239,68,68,0.25)',   label: 'Bajo' },
    MEDIO: { bg: 'rgba(245,158,11,0.1)',  color: '#b45309', border: 'rgba(245,158,11,0.25)',  label: 'Medio' },
    ALTO:  { bg: 'rgba(34,197,94,0.1)',   color: '#15803d', border: 'rgba(34,197,94,0.25)',   label: 'Alto' },
  };
  const s = map[nivel] || map.MEDIO;
  return (
    <span style={{
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
      borderRadius: 6, padding: '3px 10px', fontSize: '0.75rem', fontWeight: 700
    }}>
      {s.label}
    </span>
  );
};

/* ════════════════════════════════════════════════════
   PANTALLA PRINCIPAL
═══════════════════════════════════════════════════ */
const ReportesScreen = () => {
  const [loading,         setLoading]         = useState(false);
  const [tipoReporte,     setTipoReporte]     = useState('productos-vendidos');
  const [periodo,         setPeriodo]         = useState({
    fechaInicio: new Date(new Date().setDate(1)).toISOString().split('T')[0],
    fechaFin:    new Date().toISOString().split('T')[0]
  });
  const [datos,           setDatos]           = useState(null);
  const [rawDatos,        setRawDatos]        = useState(null); // para debug/fallback
  const [showMensual,     setShowMensual]     = useState(false);
  const [mesAnio,         setMesAnio]         = useState({
    mes: new Date().getMonth() + 1,
    anio: new Date().getFullYear()
  });
  const [generandoPDF,    setGenerandoPDF]    = useState(false);

  /* ── Carga el reporte activo ── */
  const cargarReporte = useCallback(async () => {
    try {
      setLoading(true);
      setDatos(null);

      let response;
      const params = { fecha_inicio: periodo.fechaInicio, fecha_fin: periodo.fechaFin };

      switch (tipoReporte) {
        case 'productos-vendidos': response = await reportesService.getProductosVendidos(params); break;
        case 'toppings-usados':    response = await reportesService.getToppingsUsados(params);    break;
        case 'inventario':         response = await reportesService.getReporteInventario();       break;
        case 'ventas-categoria':   response = await reportesService.getVentasPorCategoria(params);break;
        default:                   response = await reportesService.getProductosVendidos(params);
      }

      const raw = response?.data?.data ?? response?.data ?? null;
      console.log(`📊 [${tipoReporte}] Raw response:`, raw);
      setRawDatos(raw);

      const extraido = extractArray(raw, tipoReporte);
      console.log(`📋 [${tipoReporte}] Datos extraídos (${Array.isArray(extraido) ? extraido.length + ' items' : 'objeto'}):`, extraido);
      setDatos(extraido);

    } catch (error) {
      console.error('Error al cargar reporte:', error);
      toast.error('Error al cargar reporte');
      setDatos([]);
    } finally {
      setLoading(false);
    }
  }, [tipoReporte, periodo.fechaInicio, periodo.fechaFin]);

  // Recarga cuando cambia el tipo (sin esperar el botón)
  useEffect(() => { cargarReporte(); }, [tipoReporte]);

  /* ── Generar reporte mensual ── */
  const generarReporteMensual = async () => {
    try {
      setGenerandoPDF(true);
      const response = await reportesService.generarReporteMensual(mesAnio.mes, mesAnio.anio);
      if (response.data?.success) {
        toast.success('Reporte mensual generado');
        generarPDFReporteMensual(response.data.data);
        setShowMensual(false);
      } else {
        toast.error(response.data?.message || 'Error al generar');
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Error al generar reporte mensual');
    } finally {
      setGenerandoPDF(false);
    }
  };

  /* ── Descargar PDF del reporte actual ── */
  const descargarPDF = () => {
    if (!datos || (Array.isArray(datos) && datos.length === 0)) {
      toast.warning('No hay datos para generar el PDF');
      return;
    }
    try {
      switch (tipoReporte) {
        case 'productos-vendidos': generarPDFProductosVendidos(datos, periodo.fechaInicio, periodo.fechaFin); break;
        case 'toppings-usados':    generarPDFToppingsUsados(datos, periodo.fechaInicio, periodo.fechaFin);    break;
        case 'inventario':         generarPDFInventario(datos);                                              break;
        default: toast.info('PDF para este reporte en desarrollo'); return;
      }
      toast.success('PDF generado');
    } catch (err) {
      console.error(err);
      toast.error('Error al generar PDF');
    }
  };

  /* ── Datos para gráficas ── */
  const datosArray = Array.isArray(datos) ? datos : [];
  const config     = TipoReporteConfig[tipoReporte];

  const chartData = tipoReporte !== 'inventario' && datosArray.length > 0
    ? {
        labels:   datosArray.map(config.getLabel),
        datasets: [{
          label:           config.label,
          data:            datosArray.map(config.getCount),
          backgroundColor: BRAND_COLORS.slice(0, datosArray.length),
          borderColor:     BRAND_BORDERS.slice(0, datosArray.length),
          borderWidth: 2,
          borderRadius: config.chartType === 'bar' ? 8 : 0,
        }]
      }
    : null;

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        position: config.chartType === 'pie' ? 'bottom' : 'top',
        labels: { font: { family: 'DM Sans', size: 12 }, padding: 16 }
      },
      tooltip: {
        backgroundColor: 'rgba(26,10,46,0.92)',
        titleFont: { family: 'Syne', size: 13, weight: '700' },
        bodyFont: { family: 'DM Sans', size: 12 },
        padding: 12, cornerRadius: 10
      }
    },
    scales: config.chartType === 'bar' ? {
      y: { grid: { color: 'rgba(123,47,190,0.06)' }, ticks: { font: { family: 'DM Sans' } } },
      x: { grid: { display: false },                 ticks: { font: { family: 'DM Sans' } } }
    } : undefined
  };

  const teneDatos = tipoReporte === 'inventario'
    ? (datos && (arr(datos?.toppings).length > 0 || arr(datos?.materias_primas).length > 0))
    : datosArray.length > 0;

  const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

  /* ════════════════ RENDER ════════════════ */
  return (
    <>
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        .rep-page { animation: slideUp 0.35s ease; }

        /* ── Header ── */
        .rep-header {
          display: flex; align-items: flex-start;
          justify-content: space-between;
          flex-wrap: wrap; gap: 12px; margin-bottom: 22px;
        }
        .rep-title {
          font-family: 'Syne', sans-serif; font-weight: 800;
          font-size: clamp(1.35rem, 3.5vw, 1.8rem);
          color: #1a0a2e; margin: 0; letter-spacing: -0.02em;
        }
        .rep-title i { color: #7B2FBE; }
        .rep-subtitle { font-size: 0.82rem; color: #94a3b8; margin: 3px 0 0; }
        .rep-actions { display: flex; gap: 8px; flex-wrap: wrap; }

        /* ── Botones de acción ── */
        .btn-rep-mensual {
          font-family: 'DM Sans', sans-serif; font-weight: 700;
          font-size: 0.85rem; border-radius: 10px;
          background: linear-gradient(135deg, #15803d, #16a34a) !important;
          border: none !important;
          padding: 9px 16px;
          box-shadow: 0 3px 12px rgba(22,163,74,0.3) !important;
          transition: all 0.2s ease;
          color: #fff !important;
        }
        .btn-rep-mensual:hover { filter: brightness(1.08); transform: translateY(-1px); }
        .btn-rep-pdf {
          font-family: 'DM Sans', sans-serif; font-weight: 700;
          font-size: 0.85rem; border-radius: 10px;
          background: linear-gradient(135deg, #7B2FBE, #5E1F96) !important;
          border: none !important;
          padding: 9px 16px;
          box-shadow: 0 3px 12px rgba(123,47,190,0.3) !important;
          transition: all 0.2s ease;
          color: #fff !important;
        }
        .btn-rep-pdf:hover:not(:disabled) { filter: brightness(1.08); transform: translateY(-1px); }
        .btn-rep-pdf:disabled { opacity: 0.45; cursor: not-allowed; transform: none !important; }

        /* ── Filtros card ── */
        .filtros-card {
          background: #fff;
          border: 1.5px solid rgba(123,47,190,0.08);
          border-radius: 16px;
          padding: 18px 20px;
          margin-bottom: 22px;
          box-shadow: 0 2px 10px rgba(123,47,190,0.05);
        }

        /* ── Tipo selector tabs ── */
        .tipo-tabs { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 16px; }
        .tipo-tab {
          display: flex; align-items: center; gap: 7px;
          padding: 8px 14px; border-radius: 10px;
          font-family: 'DM Sans', sans-serif; font-size: 0.82rem; font-weight: 600;
          border: 1.5px solid rgba(123,47,190,0.12);
          background: #f5f0fb; color: #9580b0;
          cursor: pointer; transition: all 0.18s ease;
        }
        .tipo-tab:hover { border-color: rgba(123,47,190,0.25); color: #7B2FBE; }
        .tipo-tab.active {
          background: linear-gradient(135deg, #7B2FBE, #5E1F96);
          border-color: transparent; color: #fff;
          box-shadow: 0 3px 12px rgba(123,47,190,0.3);
        }
        .tipo-tab i { font-size: 0.9rem; }

        /* ── Periodo row ── */
        .periodo-row { display: flex; align-items: flex-end; gap: 10px; flex-wrap: wrap; }
        .periodo-field { display: flex; flex-direction: column; gap: 4px; flex: 1; min-width: 140px; }
        .periodo-label {
          font-size: 0.7rem; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.06em; color: #94a3b8;
        }

        /* ── Spinner ── */
        .rep-spinner {
          display: flex; flex-direction: column; align-items: center;
          justify-content: center; padding: 4rem; gap: 14px;
          color: #9580b0; font-family: 'DM Sans', sans-serif; font-size: 0.9rem;
        }
        .rep-ring {
          width: 40px; height: 40px; border-radius: 50%;
          border: 3px solid rgba(123,47,190,0.12);
          border-top-color: #7B2FBE;
          animation: spin 0.85s linear infinite;
        }

        /* ── Empty state ── */
        .rep-empty {
          display: flex; flex-direction: column; align-items: center;
          padding: 4rem 2rem; gap: 12px; color: #c4b0d8;
          text-align: center;
        }
        .rep-empty i { font-size: 2.5rem; opacity: 0.4; }
        .rep-empty p { font-size: 0.9rem; margin: 0; }
        .rep-empty small { font-size: 0.78rem; color: #b0a0c8; }

        /* ── Chart card ── */
        .chart-card {
          background: #fff;
          border: 1.5px solid rgba(123,47,190,0.08);
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 2px 10px rgba(123,47,190,0.05);
          height: 100%;
          animation: slideUp 0.4s ease;
        }
        .chart-card-header {
          padding: 14px 18px; border-bottom: 1px solid rgba(123,47,190,0.07);
          background: #faf8fe;
          display: flex; align-items: center; gap: 10px;
        }
        .chart-card-icon {
          width: 34px; height: 34px; border-radius: 9px;
          display: flex; align-items: center; justify-content: center;
          font-size: 1rem; background: rgba(123,47,190,0.08); color: #7B2FBE;
        }
        .chart-card-title {
          font-family: 'Syne', sans-serif; font-weight: 700;
          font-size: 0.92rem; color: #1a0a2e; margin: 0;
        }
        .chart-card-body { padding: 20px; }

        /* ── Table card ── */
        .table-card {
          background: #fff;
          border: 1.5px solid rgba(123,47,190,0.08);
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 2px 10px rgba(123,47,190,0.05);
          animation: slideUp 0.4s ease;
          height: 100%;
        }
        .table-card-header {
          padding: 14px 18px; border-bottom: 1px solid rgba(123,47,190,0.07);
          background: #faf8fe;
          display: flex; align-items: center; justify-content: space-between;
        }
        .table-card-title {
          font-family: 'Syne', sans-serif; font-weight: 700;
          font-size: 0.92rem; color: #1a0a2e; margin: 0;
        }
        .table-count {
          display: inline-flex; align-items: center;
          background: rgba(123,47,190,0.08); color: #7B2FBE;
          border-radius: 6px; padding: 3px 10px;
          font-size: 0.75rem; font-weight: 700;
        }

        /* ── Rep table ── */
        .rep-table { width: 100%; border-collapse: collapse; }
        .rep-table thead th {
          font-size: 0.68rem; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.08em;
          color: #94a3b8; padding: 10px 14px;
          background: #f5f0fb; border: none;
          white-space: nowrap;
        }
        .rep-table tbody td {
          padding: 11px 14px; border: none;
          border-top: 1px solid rgba(123,47,190,0.05);
          font-size: 0.875rem; color: #1a0a2e;
          vertical-align: middle;
        }
        .rep-table tbody tr:hover td { background: rgba(123,47,190,0.03); }
        .rep-table .num-col { font-family: 'Syne', sans-serif; font-weight: 700; color: #7B2FBE; }

        /* ── Badges y chips ── */
        .rep-badge { border-radius: 6px; padding: 3px 10px; font-size: 0.73rem; font-weight: 600; }
        .rep-badge.cat { background: rgba(123,47,190,0.08); color: #7B2FBE; }
        .rep-count {
          display: inline-flex; align-items: center; justify-content: center;
          background: rgba(123,47,190,0.08); color: #5E1F96;
          border-radius: 6px; padding: 3px 10px; font-weight: 700;
          font-size: 0.82rem; font-family: 'Syne', sans-serif;
        }

        /* ── Inventario sub-tablas ── */
        .inv-section { margin-bottom: 28px; }
        .inv-section-title {
          font-family: 'Syne', sans-serif; font-weight: 700;
          font-size: 0.9rem; color: #1a0a2e;
          display: flex; align-items: center; gap: 8px;
          margin-bottom: 10px; padding-bottom: 8px;
          border-bottom: 1.5px solid rgba(123,47,190,0.08);
        }

        /* ── Modal ── */
        .modal-content { border-radius: 16px !important; }
        .modal-mensual-body { padding: 24px !important; }
        .btn-generar {
          background: linear-gradient(135deg, #15803d, #16a34a) !important;
          border: none !important; border-radius: 10px !important;
          font-family: 'DM Sans', sans-serif; font-weight: 700 !important;
          box-shadow: 0 3px 12px rgba(22,163,74,0.3) !important;
        }

        @media (max-width: 576px) {
          .tipo-tabs { gap: 4px; }
          .tipo-tab { padding: 6px 10px; font-size: 0.78rem; }
          .tipo-tab span.label { display: none; }
        }
      `}</style>

      <div className="rep-page">
        {/* ── Header ── */}
        <div className="rep-header">
          <div>
            <h2 className="rep-title">
              <i className="bi bi-graph-up me-2" />
              Reportes
            </h2>
            <p className="rep-subtitle">Análisis y estadísticas del negocio</p>
          </div>
          <div className="rep-actions">
            <button className="btn-rep-mensual btn" onClick={() => setShowMensual(true)}>
              <i className="bi bi-calendar-month me-2" />
              Reporte Mensual
            </button>
            <button
              className="btn-rep-pdf btn"
              onClick={descargarPDF}
              disabled={!teneDatos}
            >
              <i className="bi bi-file-earmark-arrow-down me-2" />
              Descargar PDF
            </button>
          </div>
        </div>

        {/* ── Filtros ── */}
        <div className="filtros-card">
          {/* Tipo tabs */}
          <div className="tipo-tabs">
            {Object.entries(TipoReporteConfig).map(([key, cfg]) => (
              <button
                key={key}
                className={`tipo-tab ${tipoReporte === key ? 'active' : ''}`}
                onClick={() => setTipoReporte(key)}
              >
                <i className={`bi ${cfg.icon}`} />
                <span className="label">{cfg.label}</span>
              </button>
            ))}
          </div>

          {/* Periodo (oculto en inventario) */}
          {tipoReporte !== 'inventario' && (
            <div className="periodo-row">
              <div className="periodo-field">
                <span className="periodo-label">Fecha inicio</span>
                <Form.Control
                  type="date"
                  value={periodo.fechaInicio}
                  onChange={(e) => setPeriodo(p => ({ ...p, fechaInicio: e.target.value }))}
                  style={{ borderRadius: 10, borderColor: 'rgba(123,47,190,0.2)', fontSize: '0.875rem' }}
                />
              </div>
              <div className="periodo-field">
                <span className="periodo-label">Fecha fin</span>
                <Form.Control
                  type="date"
                  value={periodo.fechaFin}
                  onChange={(e) => setPeriodo(p => ({ ...p, fechaFin: e.target.value }))}
                  style={{ borderRadius: 10, borderColor: 'rgba(123,47,190,0.2)', fontSize: '0.875rem' }}
                />
              </div>
              <Button
                onClick={cargarReporte}
                disabled={loading}
                style={{
                  background: 'linear-gradient(135deg, #7B2FBE, #5E1F96)',
                  border: 'none', borderRadius: 10, fontWeight: 700,
                  padding: '9px 20px', fontSize: '0.85rem',
                  boxShadow: '0 3px 12px rgba(123,47,190,0.25)'
                }}
              >
                {loading
                  ? <><div className="rep-ring" style={{ width: 16, height: 16, marginRight: 6, display: 'inline-block', verticalAlign: 'middle' }} />Cargando</>
                  : <><i className="bi bi-search me-2" />Consultar</>
                }
              </Button>
            </div>
          )}
        </div>

        {/* ── Contenido ── */}
        {loading ? (
          <div className="rep-spinner">
            <div className="rep-ring" />
            Cargando datos del reporte...
          </div>
        ) : (
          <Row className="g-3">
            {/* Gráfica — solo si hay datos y no es inventario */}
            {chartData && (
              <Col xs={12} lg={5}>
                <div className="chart-card">
                  <div className="chart-card-header">
                    <div className="chart-card-icon">
                      <i className={`bi ${config.icon}`} />
                    </div>
                    <p className="chart-card-title">Visualización</p>
                  </div>
                  <div className="chart-card-body">
                    {config.chartType === 'bar'
                      ? <Bar data={chartData} options={chartOptions} />
                      : <Pie data={chartData} options={chartOptions} />
                    }
                  </div>
                </div>
              </Col>
            )}

            {/* Tabla de datos */}
            <Col xs={12} lg={chartData ? 7 : 12}>
              <div className="table-card">
                <div className="table-card-header">
                  <p className="table-card-title">
                    <i className={`bi ${config.icon} me-2`} style={{ color: config.color }} />
                    {config.label}
                  </p>
                  {tipoReporte !== 'inventario' && datosArray.length > 0 && (
                    <span className="table-count">{datosArray.length} registros</span>
                  )}
                </div>

                {/* ── Inventario especial ── */}
                {tipoReporte === 'inventario' ? (
                  <div style={{ padding: '16px 20px' }}>
                    {!teneDatos ? (
                      <div className="rep-empty">
                        <i className="bi bi-box-seam" />
                        <p>No hay datos de inventario</p>
                      </div>
                    ) : (
                      <>
                        {arr(datos?.toppings).length > 0 && (
                          <div className="inv-section">
                            <div className="inv-section-title">
                              <i className="bi bi-stars" style={{ color: '#b45309' }} />
                              Toppings
                              <span className="table-count" style={{ marginLeft: 'auto' }}>{datos.toppings.length}</span>
                            </div>
                            <div className="table-responsive">
                              <table className="rep-table">
                                <thead>
                                  <tr>
                                    <th>Topping</th>
                                    <th style={{ textAlign: 'right' }}>Stock actual</th>
                                    <th style={{ textAlign: 'right' }}>Stock mínimo</th>
                                    <th>Estado</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {datos.toppings.map((item, i) => (
                                    <tr key={i}>
                                      <td><strong>{item.nombre_topping || item.nombre}</strong></td>
                                      <td style={{ textAlign: 'right' }}><span className="rep-count">{item.stock_actual ?? '—'}</span></td>
                                      <td style={{ textAlign: 'right', color: '#94a3b8' }}>{item.stock_minimo ?? '—'}</td>
                                      <td><StockBadge nivel={item.nivel_stock} /></td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                        {arr(datos?.materias_primas).length > 0 && (
                          <div className="inv-section">
                            <div className="inv-section-title">
                              <i className="bi bi-box-seam" style={{ color: '#16a34a' }} />
                              Materias Primas
                              <span className="table-count" style={{ marginLeft: 'auto' }}>{datos.materias_primas.length}</span>
                            </div>
                            <div className="table-responsive">
                              <table className="rep-table">
                                <thead>
                                  <tr>
                                    <th>Materia Prima</th>
                                    <th style={{ textAlign: 'right' }}>Cantidad actual</th>
                                    <th style={{ textAlign: 'right' }}>Cantidad mínima</th>
                                    <th>Estado</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {datos.materias_primas.map((item, i) => (
                                    <tr key={i}>
                                      <td><strong>{item.nombre_materia || item.nombre}</strong></td>
                                      <td style={{ textAlign: 'right' }}><span className="rep-count">{item.cantidad_actual ?? '—'}</span></td>
                                      <td style={{ textAlign: 'right', color: '#94a3b8' }}>{item.cantidad_minima ?? '—'}</td>
                                      <td><StockBadge nivel={item.nivel_stock} /></td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ) : datosArray.length === 0 ? (
                  <div className="rep-empty">
                    <i className="bi bi-inbox" />
                    <p>Sin datos para el período seleccionado</p>
                    <small>Prueba cambiando las fechas o el tipo de reporte</small>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="rep-table">
                      <thead>
                        <tr>
                          {config.headers.map((h, i) => (
                            <th key={i} style={i >= config.headers.length - 2 && i !== 0 ? { textAlign: 'right' } : {}}>
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {datosArray.map((item, idx) => {
                          const cols = config.renderRow(item, idx);
                          return (
                            <tr key={idx}>
                              {cols.map((col, ci) => (
                                <td
                                  key={ci}
                                  className={ci === 0 && tipoReporte !== 'ventas-categoria' ? 'num-col' : ''}
                                  style={ci >= cols.length - 2 && ci !== 0 ? { textAlign: 'right' } : {}}
                                >
                                  {col}
                                </td>
                              ))}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </Col>
          </Row>
        )}
      </div>

      {/* ── Modal Reporte Mensual ── */}
      <Modal show={showMensual} onHide={() => setShowMensual(false)} centered>
        <Modal.Header
          closeButton
          style={{
            background: 'linear-gradient(135deg, #5E1F96, #7B2FBE)',
            borderBottom: 'none', borderRadius: '16px 16px 0 0'
          }}
        >
          <Modal.Title style={{ color: '#fff', fontFamily: 'Syne', fontWeight: 800, fontSize: '1rem' }}>
            <i className="bi bi-calendar-month me-2" />
            Generar Reporte Mensual
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="modal-mensual-body">
          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#94a3b8' }}>
                  Mes
                </Form.Label>
                <Form.Select
                  value={mesAnio.mes}
                  onChange={(e) => setMesAnio(m => ({ ...m, mes: parseInt(e.target.value) }))}
                  style={{ borderRadius: 10, borderColor: 'rgba(123,47,190,0.2)' }}
                >
                  {meses.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#94a3b8' }}>
                  Año
                </Form.Label>
                <Form.Control
                  type="number"
                  value={mesAnio.anio}
                  onChange={(e) => setMesAnio(m => ({ ...m, anio: parseInt(e.target.value) }))}
                  min="2020"
                  max={new Date().getFullYear()}
                  style={{ borderRadius: 10, borderColor: 'rgba(123,47,190,0.2)' }}
                />
              </Form.Group>
            </Col>
          </Row>
          <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: 0 }}>
            <i className="bi bi-info-circle me-1" />
            Se generará un PDF con el resumen de ventas del mes seleccionado.
          </p>
        </Modal.Body>
        <Modal.Footer style={{ background: '#f5f0fb', borderTop: '1px solid rgba(123,47,190,0.08)', borderRadius: '0 0 16px 16px' }}>
          <Button variant="light" onClick={() => setShowMensual(false)} style={{ borderRadius: 10, fontWeight: 600 }}>
            Cancelar
          </Button>
          <Button
            className="btn-generar"
            onClick={generarReporteMensual}
            disabled={generandoPDF}
          >
            {generandoPDF
              ? <><Spinner size="sm" className="me-2" />Generando...</>
              : <><i className="bi bi-file-earmark-pdf me-2" />Generar PDF</>
            }
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default ReportesScreen;