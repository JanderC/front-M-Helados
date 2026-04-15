import { useState, useEffect, useCallback } from 'react';
import { ventasService } from '../../api/services/ventasService';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { toast } from 'react-toastify';
import DetalleVentaModal from '../../components/ventas/DetalleVentaModal';

const COLORES_ESTADO = {
  COMPLETADA: { bg: "rgba(16,185,129,0.1)", color: "#10b981", border: "rgba(16,185,129,0.2)", dot: "#10b981" },
  EN_PROCESO: { bg: "rgba(245,158,11,0.1)", color: "#d97706", border: "rgba(245,158,11,0.2)", dot: "#f59e0b" },
  PENDIENTE:  { bg: "rgba(99,102,241,0.1)", color: "#6366f1", border: "rgba(99,102,241,0.2)", dot: "#6366f1" },
  CANCELADA:  { bg: "rgba(239,68,68,0.08)", color: "#ef4444", border: "rgba(239,68,68,0.15)", dot: "#ef4444" },
  DEVUELTA:   { bg: "rgba(139,92,246,0.1)", color: "#8b5cf6", border: "rgba(139,92,246,0.2)", dot: "#8b5cf6" },
};

const MONEDA_FLAGS = { COP: "🇨🇴", USD: "🇺🇸", VES: "🇻🇪" };

const PAGE_SIZE = 20;

// Devuelve la fecha de hoy en formato YYYY-MM-DD (local)
const hoy = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const ListaVentasScreen = () => {
  const [ventas, setVentas]                   = useState([]);
  const [totalRegistros, setTotalRegistros]   = useState(0);
  const [loading, setLoading]                 = useState(true);
  const [showModal, setShowModal]             = useState(false);
  const [ventaSeleccionada, setVentaSeleccionada] = useState(null);
  const [page, setPage]                       = useState(1);
  const [filtros, setFiltros]                 = useState({ estado_venta: '', fecha_inicio: hoy(), fecha_fin: hoy() });
  const [filtroActivo, setFiltroActivo]       = useState('');

  const totalPages = Math.max(1, Math.ceil(totalRegistros / PAGE_SIZE));

  // ── Carga ──────────────────────────────────────────────────────────────────
  const loadVentas = useCallback(async (filtrosParam, pageParam) => {
    try {
      setLoading(true);
      const f  = filtrosParam !== undefined ? filtrosParam : filtros;
      const pg = pageParam    !== undefined ? pageParam    : page;

      const params = {
        limit:  PAGE_SIZE,
        offset: (pg - 1) * PAGE_SIZE,
      };
      if (f.estado_venta) params.estado_venta = f.estado_venta;
      if (f.fecha_inicio) params.fecha_inicio = f.fecha_inicio;
      if (f.fecha_fin)    params.fecha_fin    = f.fecha_fin;

      const response = await ventasService.getAll(params);
      if (response.data.success) {
        setVentas(response.data.data || []);
        // El backend debe devolver response.data.total_count (ver ventasController actualizado)
        setTotalRegistros(response.data.total_count ?? response.data.data?.length ?? 0);
      }
    } catch {
      toast.error('Error al cargar ventas');
    } finally {
      setLoading(false);
    }
  }, [filtros, page]);

  useEffect(() => { loadVentas(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleVerDetalle = (venta) => {
    setVentaSeleccionada(venta.id_venta);
    setShowModal(true);
  };

  const handleFiltrarEstado = (estado) => {
    const nuevo    = filtroActivo === estado ? '' : estado;
    const nuevos   = { ...filtros, estado_venta: nuevo };
    setFiltroActivo(nuevo);
    setFiltros(nuevos);
    setPage(1);
    loadVentas(nuevos, 1);
  };

  const handleFiltrarFechas = () => {
    setPage(1);
    loadVentas(filtros, 1);
  };

  const handleLimpiar = () => {
    const limpios = { estado_venta: '', fecha_inicio: hoy(), fecha_fin: hoy() };
    setFiltros(limpios);
    setFiltroActivo('');
    setPage(1);
    loadVentas(limpios, 1);
  };

  const handleVerTodas = () => {
    const todos = { estado_venta: '', fecha_inicio: '', fecha_fin: '' };
    setFiltros(todos);
    setFiltroActivo('');
    setPage(1);
    loadVentas(todos, 1);
  };

  const handlePage = (nueva) => {
    if (nueva < 1 || nueva > totalPages) return;
    setPage(nueva);
    loadVentas(undefined, nueva);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ── Stats de la página actual ──────────────────────────────────────────────
  const stats = {
    total:      totalRegistros,
    completadas: ventas.filter(v => v.estado_venta === 'COMPLETADA').length,
    pendientes:  ventas.filter(v => v.estado_venta === 'PENDIENTE').length,
    en_proceso:  ventas.filter(v => v.estado_venta === 'EN_PROCESO').length,
  };

  const esFiltroHoy = filtros.fecha_inicio === hoy() && filtros.fecha_fin === hoy() && !filtros.estado_venta;

  // ── Paginación: números a mostrar ─────────────────────────────────────────
  const paginasVisibles = () => {
    const delta = 2;
    const range = [];
    const left  = Math.max(2, page - delta);
    const right = Math.min(totalPages - 1, page + delta);
    range.push(1);
    if (left > 2) range.push('...');
    for (let i = left; i <= right; i++) range.push(i);
    if (right < totalPages - 1) range.push('...');
    if (totalPages > 1) range.push(totalPages);
    return range;
  };

  return (
    <>
      <style>{`
        /* ===== LISTA VENTAS SCREEN ===== */
        .lv-container {
          display: flex;
          flex-direction: column;
          gap: 16px;
          animation: fadeInUp 0.3s ease;
        }
        @keyframes fadeInUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }

        /* Header */
        .lv-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
        }
        .lv-title {
          font-family: 'Syne', sans-serif;
          font-weight: 800;
          font-size: clamp(1.1rem, 2.5vw, 1.5rem);
          color: #1a0a2e;
          margin: 0;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .lv-title-icon {
          width: 40px; height: 40px;
          background: linear-gradient(135deg, #7B2FBE, #5E1F96);
          border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
          color: #fff; font-size: 1.1rem;
          box-shadow: 0 4px 16px rgba(123,47,190,0.4);
          flex-shrink: 0;
        }

        /* Stats cards */
        .stats-row {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
        }
        .stat-card {
          background: #fff;
          border-radius: 14px;
          border: 1px solid rgba(123,47,190,0.08);
          padding: 14px 16px;
          display: flex;
          align-items: center;
          gap: 12px;
          box-shadow: 0 2px 8px rgba(123,47,190,0.05);
          transition: all 0.2s;
          cursor: pointer;
          touch-action: manipulation;
          user-select: none;
          -webkit-tap-highlight-color: transparent;
        }
        .stat-card:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(123,47,190,0.12); }
        .stat-card.active { border-color: #7B2FBE; box-shadow: 0 4px 16px rgba(123,47,190,0.2); }
        .stat-icon {
          width: 40px; height: 40px;
          border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          font-size: 1.1rem;
          flex-shrink: 0;
        }
        .stat-num {
          font-family: 'Syne', sans-serif;
          font-weight: 800;
          font-size: 1.4rem;
          color: #1a0a2e;
          line-height: 1;
        }
        .stat-label {
          font-family: 'DM Sans', sans-serif;
          font-size: 0.72rem;
          font-weight: 600;
          color: #9580b0;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          line-height: 1.2;
        }

        /* Panel de filtros */
        .filtros-panel {
          background: #fff;
          border-radius: 16px;
          border: 1px solid rgba(123,47,190,0.08);
          padding: 16px;
          box-shadow: 0 2px 8px rgba(123,47,190,0.05);
        }
        .filtros-title {
          font-family: 'DM Sans', sans-serif;
          font-weight: 700;
          font-size: 0.72rem;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #9580b0;
          margin-bottom: 12px;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .filtros-row {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        /* Estado chips */
        .estado-chips {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
          flex: 1;
        }
        .estado-chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 7px 14px;
          border-radius: 999px;
          border: 1.5px solid transparent;
          font-family: 'DM Sans', sans-serif;
          font-weight: 700;
          font-size: 0.78rem;
          cursor: pointer;
          transition: all 0.2s;
          background: #f5f0fb;
          color: #5a4a72;
          touch-action: manipulation;
          user-select: none;
          -webkit-tap-highlight-color: transparent;
        }
        .estado-chip:hover { transform: translateY(-1px); }
        .estado-chip.active {
          color: #fff !important;
          background: linear-gradient(135deg, #7B2FBE, #5E1F96) !important;
          border-color: transparent !important;
          box-shadow: 0 4px 14px rgba(123,47,190,0.35);
        }
        .chip-dot {
          width: 7px; height: 7px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        /* Inputs de fecha */
        .fecha-wrap {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }
        .fecha-group {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }
        .fecha-label {
          font-family: 'DM Sans', sans-serif;
          font-size: 0.65rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.07em;
          color: #9580b0;
        }
        .fecha-input {
          border: 1.5px solid rgba(123,47,190,0.12);
          border-radius: 9px;
          padding: 7px 10px;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.82rem;
          color: #1a0a2e;
          background: #f5f0fb;
          outline: none;
          transition: border-color 0.2s;
          cursor: pointer;
        }
        .fecha-input:focus { border-color: #7B2FBE; background: #fff; }

        .filtrar-btn {
          background: linear-gradient(135deg, #7B2FBE, #5E1F96);
          border: none;
          border-radius: 10px;
          color: #fff;
          font-family: 'DM Sans', sans-serif;
          font-weight: 700;
          font-size: 0.82rem;
          padding: 9px 18px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          box-shadow: 0 4px 14px rgba(123,47,190,0.35);
          transition: all 0.2s;
          touch-action: manipulation;
          white-space: nowrap;
        }
        .filtrar-btn:hover { filter: brightness(1.08); transform: translateY(-1px); }

        .limpiar-btn {
          background: #f5f0fb;
          border: 1.5px solid rgba(123,47,190,0.12);
          border-radius: 10px;
          color: #7B2FBE;
          font-family: 'DM Sans', sans-serif;
          font-weight: 700;
          font-size: 0.82rem;
          padding: 9px 14px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: all 0.2s;
          touch-action: manipulation;
          white-space: nowrap;
        }
        .limpiar-btn:hover { background: rgba(123,47,190,0.1); }

        /* Banner "ver todas" */
        .ver-todas-banner {
          background: rgba(123,47,190,0.04);
          border: 1.5px dashed rgba(123,47,190,0.2);
          border-radius: 10px;
          padding: 8px 14px;
          display: flex;
          align-items: center;
          gap: 8px;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.8rem;
          color: #7B2FBE;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          touch-action: manipulation;
          white-space: nowrap;
        }
        .ver-todas-banner:hover { background: rgba(123,47,190,0.09); }

        /* Tabla/Cards de ventas */
        .ventas-panel {
          background: #fff;
          border-radius: 16px;
          border: 1px solid rgba(123,47,190,0.08);
          box-shadow: 0 2px 8px rgba(123,47,190,0.05);
          overflow: hidden;
        }
        .ventas-panel-header {
          padding: 14px 18px;
          border-bottom: 1px solid rgba(123,47,190,0.08);
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 8px;
        }
        .ventas-count {
          font-family: 'DM Sans', sans-serif;
          font-weight: 700;
          font-size: 0.82rem;
          color: #9580b0;
        }
        .ventas-count span {
          color: #7B2FBE;
          font-family: 'Syne', sans-serif;
          font-size: 1rem;
        }

        /* Tabla desktop */
        .ventas-table {
          width: 100%;
          border-collapse: collapse;
          font-family: 'DM Sans', sans-serif;
        }
        .ventas-table thead th {
          background: #f9f7fd;
          padding: 10px 16px;
          font-size: 0.68rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #9580b0;
          border-bottom: 1px solid rgba(123,47,190,0.08);
          white-space: nowrap;
          position: sticky;
          top: 0;
          z-index: 10;
        }
        .ventas-table tbody tr {
          border-bottom: 1px solid rgba(123,47,190,0.05);
          transition: background 0.15s;
          cursor: pointer;
        }
        .ventas-table tbody tr:hover { background: #f9f7fd; }
        .ventas-table tbody tr:last-child { border-bottom: none; }
        .ventas-table tbody td {
          padding: 12px 16px;
          font-size: 0.875rem;
          color: #1a0a2e;
          vertical-align: middle;
        }

        .factura-chip {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          background: rgba(123,47,190,0.08);
          color: #7B2FBE;
          border-radius: 8px;
          padding: 3px 10px;
          font-family: 'Syne', sans-serif;
          font-weight: 700;
          font-size: 0.78rem;
          white-space: nowrap;
        }

        .estado-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 4px 10px;
          border-radius: 999px;
          font-size: 0.72rem;
          font-weight: 700;
          white-space: nowrap;
          border: 1px solid;
        }
        .estado-badge-dot {
          width: 6px; height: 6px;
          border-radius: 50%;
        }

        .moneda-chip {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 2px 8px;
          border-radius: 6px;
          background: #f5f0fb;
          color: #5a4a72;
          font-size: 0.75rem;
          font-weight: 700;
          font-family: 'DM Sans', sans-serif;
        }

        .total-cell {
          font-family: 'Syne', sans-serif;
          font-weight: 800;
          font-size: 0.95rem;
          color: #1a0a2e;
        }

        .usuario-cell {
          font-size: 0.82rem;
          color: #5a4a72;
        }

        .ver-detail-btn {
          background: rgba(123,47,190,0.08);
          border: 1.5px solid rgba(123,47,190,0.15);
          border-radius: 9px;
          color: #7B2FBE;
          cursor: pointer;
          padding: 7px 14px;
          font-size: 0.78rem;
          font-weight: 700;
          font-family: 'DM Sans', sans-serif;
          display: flex;
          align-items: center;
          gap: 5px;
          transition: all 0.15s;
          white-space: nowrap;
          touch-action: manipulation;
        }
        .ver-detail-btn:hover { background: rgba(123,47,190,0.14); border-color: #7B2FBE; transform: scale(1.03); }
        .ver-detail-btn:active { transform: scale(0.97); }

        /* Cards en móvil */
        .ventas-cards {
          display: none;
          flex-direction: column;
          gap: 0;
        }
        .venta-card {
          padding: 14px 16px;
          border-bottom: 1px solid rgba(123,47,190,0.06);
          cursor: pointer;
          transition: background 0.15s;
          touch-action: manipulation;
          -webkit-tap-highlight-color: transparent;
        }
        .venta-card:hover, .venta-card:active { background: #f9f7fd; }
        .venta-card:last-child { border-bottom: none; }
        .venta-card-top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 8px;
        }
        .venta-card-left { flex: 1; min-width: 0; }
        .venta-card-factura {
          font-family: 'Syne', sans-serif;
          font-weight: 700;
          font-size: 0.85rem;
          color: #7B2FBE;
          margin-bottom: 3px;
        }
        .venta-card-cliente {
          font-weight: 600;
          font-size: 0.88rem;
          color: #1a0a2e;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          margin-bottom: 2px;
        }
        .venta-card-fecha {
          font-size: 0.72rem;
          color: #9580b0;
        }
        .venta-card-total {
          font-family: 'Syne', sans-serif;
          font-weight: 800;
          font-size: 1.1rem;
          color: #1a0a2e;
          text-align: right;
          flex-shrink: 0;
        }
        .venta-card-bottom {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }

        /* Loading skeleton */
        .skeleton {
          background: linear-gradient(90deg, #f5f0fb 25%, #ede4f8 50%, #f5f0fb 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
          border-radius: 8px;
        }
        @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

        /* Empty state */
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 64px 24px;
          text-align: center;
        }
        .empty-icon { font-size: 4rem; margin-bottom: 16px; opacity: 0.4; }
        .empty-title {
          font-family: 'Syne', sans-serif;
          font-weight: 700;
          font-size: 1.1rem;
          color: #5a4a72;
          margin-bottom: 8px;
        }
        .empty-sub {
          font-family: 'DM Sans', sans-serif;
          font-size: 0.85rem;
          color: #c4b0d8;
        }

        /* ── Paginación ── */
        .pagination-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 18px;
          border-top: 1px solid rgba(123,47,190,0.08);
          flex-wrap: wrap;
          gap: 10px;
        }
        .pagination-info {
          font-family: 'DM Sans', sans-serif;
          font-size: 0.78rem;
          color: #9580b0;
          font-weight: 600;
        }
        .pagination-info strong {
          color: #1a0a2e;
        }
        .pagination-btns {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .pg-btn {
          min-width: 34px;
          height: 34px;
          border-radius: 9px;
          border: 1.5px solid rgba(123,47,190,0.12);
          background: #fff;
          color: #5a4a72;
          font-family: 'DM Sans', sans-serif;
          font-weight: 700;
          font-size: 0.82rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s;
          padding: 0 8px;
          touch-action: manipulation;
          user-select: none;
        }
        .pg-btn:hover:not(:disabled) { background: rgba(123,47,190,0.08); border-color: #7B2FBE; color: #7B2FBE; }
        .pg-btn.active {
          background: linear-gradient(135deg, #7B2FBE, #5E1F96);
          border-color: transparent;
          color: #fff;
          box-shadow: 0 3px 10px rgba(123,47,190,0.35);
        }
        .pg-btn:disabled { opacity: 0.35; cursor: not-allowed; }
        .pg-ellipsis {
          width: 28px;
          text-align: center;
          color: #9580b0;
          font-size: 0.85rem;
          font-family: 'DM Sans', sans-serif;
        }

        /* Spin */
        @keyframes spin { to { transform: rotate(360deg); } }

        /* Responsive */
        @media (max-width: 767px) {
          .stats-row { grid-template-columns: repeat(2, 1fr); }
          .ventas-table { display: none; }
          .ventas-cards { display: flex !important; }
          .filtros-row { flex-direction: column; align-items: stretch; }
          .fecha-wrap { flex-direction: column; align-items: stretch; }
          .fecha-input { width: 100%; }
          .estado-chips { justify-content: flex-start; }
          .filtrar-btn, .limpiar-btn { justify-content: center; }
          .pagination-bar { justify-content: center; }
        }

        @media (min-width: 768px) and (max-width: 991px) {
          .stats-row { grid-template-columns: repeat(4, 1fr); }
          .ventas-table td:nth-child(3), .ventas-table th:nth-child(3) { display: none; }
        }

        @media (max-width: 480px) {
          .stats-row { grid-template-columns: repeat(2, 1fr); gap: 8px; }
          .stat-card { padding: 12px; }
          .stat-num { font-size: 1.2rem; }
          .pg-btn { min-width: 30px; height: 30px; font-size: 0.75rem; }
        }
      `}</style>

      <div className="lv-container">

        {/* ── Header ── */}
        <div className="lv-header">
          <h2 className="lv-title">
            <div className="lv-title-icon"><i className="bi bi-receipt-cutoff"></i></div>
            Lista de Ventas
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {esFiltroHoy && (
              <span style={{ background: "rgba(16,185,129,0.1)", color: "#10b981", borderRadius: 8, padding: "4px 10px", fontSize: "0.75rem", fontWeight: 700, fontFamily: "'DM Sans', sans-serif", border: "1px solid rgba(16,185,129,0.2)" }}>
                📅 Hoy
              </span>
            )}
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.82rem", color: "#9580b0" }}>
              {new Date().toLocaleDateString("es-CO", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </span>
          </div>
        </div>

        {/* ── Stats ── */}
        {!loading && (
          <div className="stats-row">
            {[
              { key: "",           label: "Total del día",  num: stats.total,       icon: "📋", bg: "rgba(123,47,190,0.08)", iconColor: "#7B2FBE" },
              { key: "COMPLETADA", label: "Completadas",    num: stats.completadas, icon: "✅", bg: "rgba(16,185,129,0.08)", iconColor: "#10b981" },
              { key: "PENDIENTE",  label: "Pendientes",     num: stats.pendientes,  icon: "⏳", bg: "rgba(99,102,241,0.08)", iconColor: "#6366f1" },
              { key: "EN_PROCESO", label: "En Proceso",     num: stats.en_proceso,  icon: "⚡", bg: "rgba(245,158,11,0.08)", iconColor: "#f59e0b" },
            ].map((s) => (
              <div
                key={s.key}
                className={`stat-card ${filtroActivo === s.key && s.key !== "" ? "active" : ""}`}
                onClick={() => s.key !== "" ? handleFiltrarEstado(s.key) : handleLimpiar()}
              >
                <div className="stat-icon" style={{ background: s.bg }}>
                  <span style={{ fontSize: "1.2rem" }}>{s.icon}</span>
                </div>
                <div>
                  <div className="stat-num">{s.num}</div>
                  <div className="stat-label">{s.label}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Filtros ── */}
        <div className="filtros-panel">
          <div className="filtros-title">
            <i className="bi bi-funnel-fill"></i>
            Filtros
          </div>
          <div className="filtros-row">
            <div className="estado-chips">
              {["PENDIENTE", "EN_PROCESO", "COMPLETADA", "CANCELADA", "DEVUELTA"].map((e) => {
                const col = COLORES_ESTADO[e] || {};
                return (
                  <button key={e} className={`estado-chip ${filtroActivo === e ? "active" : ""}`} onClick={() => handleFiltrarEstado(e)} style={filtroActivo !== e ? { borderColor: col.border, color: col.color, background: col.bg } : {}}>
                    <span className="chip-dot" style={{ background: col.dot || "#9580b0" }}></span>
                    {e.replace("_", " ")}
                  </button>
                );
              })}
            </div>

            <div className="fecha-wrap">
              <div className="fecha-group">
                <div className="fecha-label">Desde</div>
                <input className="fecha-input" type="date" value={filtros.fecha_inicio} onChange={(e) => setFiltros({ ...filtros, fecha_inicio: e.target.value })} />
              </div>
              <div className="fecha-group">
                <div className="fecha-label">Hasta</div>
                <input className="fecha-input" type="date" value={filtros.fecha_fin} onChange={(e) => setFiltros({ ...filtros, fecha_fin: e.target.value })} />
              </div>
              <button className="filtrar-btn" onClick={handleFiltrarFechas}>
                <i className="bi bi-search"></i>
                Buscar
              </button>
              {(filtros.fecha_inicio || filtros.fecha_fin || filtroActivo) && (
                <button className="limpiar-btn" onClick={handleLimpiar}>
                  <i className="bi bi-x-circle"></i>
                  Hoy
                </button>
              )}
              <button className="ver-todas-banner" onClick={handleVerTodas} title="Ver todas las ventas sin filtro de fecha">
                <i className="bi bi-calendar-range"></i>
                Ver todas
              </button>
            </div>
          </div>
        </div>

        {/* ── Panel de ventas ── */}
        <div className="ventas-panel">
          <div className="ventas-panel-header">
            <div className="ventas-count">
              {totalRegistros > 0
                ? <>Mostrando <span>{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, totalRegistros)}</span> de <span>{totalRegistros}</span> ventas{filtroActivo && <> · estado <span>{filtroActivo}</span></>}</>
                : <>Sin ventas{filtroActivo ? ` con estado "${filtroActivo}"` : ""}</>
              }
            </div>
            {loading && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#9580b0", fontSize: "0.78rem" }}>
                <div style={{ width: 14, height: 14, border: "2px solid rgba(123,47,190,0.2)", borderTopColor: "#7B2FBE", borderRadius: "50%", animation: "spin 0.7s linear infinite" }}></div>
                Cargando...
              </div>
            )}
          </div>

          {loading ? (
            <div style={{ padding: "16px" }}>
              {[...Array(6)].map((_, i) => (
                <div key={i} style={{ display: "flex", gap: 12, padding: "12px 0", borderBottom: "1px solid rgba(123,47,190,0.05)", alignItems: "center" }}>
                  <div className="skeleton" style={{ width: 90, height: 28 }}></div>
                  <div className="skeleton" style={{ width: 120, height: 18 }}></div>
                  <div className="skeleton" style={{ flex: 1, height: 18 }}></div>
                  <div className="skeleton" style={{ width: 80, height: 28 }}></div>
                  <div className="skeleton" style={{ width: 70, height: 28 }}></div>
                </div>
              ))}
            </div>
          ) : ventas.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🍦</div>
              <div className="empty-title">No hay ventas{filtroActivo ? ` con estado "${filtroActivo}"` : esFiltroHoy ? " hoy" : ""}</div>
              <div className="empty-sub">{filtroActivo ? "Prueba con otro filtro" : esFiltroHoy ? "Las ventas del día aparecerán aquí" : "Las ventas aparecerán aquí"}</div>
            </div>
          ) : (
            <>
              {/* Tabla desktop */}
              <div style={{ overflowX: "auto" }}>
                <table className="ventas-table">
                  <thead>
                    <tr>
                      <th>Factura</th>
                      <th>Fecha</th>
                      <th>Usuario</th>
                      <th>Cliente</th>
                      <th>Total</th>
                      <th>Moneda</th>
                      <th>Estado</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {ventas.map((venta) => {
                      const col = COLORES_ESTADO[venta.estado_venta] || { bg: "#f5f5f5", color: "#9580b0", border: "rgba(0,0,0,0.1)", dot: "#9580b0" };
                      return (
                        <tr key={venta.id_venta} onClick={() => handleVerDetalle(venta)}>
                          <td><span className="factura-chip"><i className="bi bi-receipt"></i>{venta.numero_factura}</span></td>
                          <td style={{ fontSize: "0.8rem", color: "#5a4a72", whiteSpace: "nowrap" }}>{formatDateTime(venta.fecha_venta)}</td>
                          <td className="usuario-cell">{venta.nombre_usuario || "—"}</td>
                          <td style={{ fontWeight: 600, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{venta.nombre_cliente || "Cliente General"}</td>
                          <td className="total-cell">{formatCurrency(venta.total, venta.codigo_moneda)}</td>
                          <td>
                            <span className="moneda-chip">
                              {MONEDA_FLAGS[venta.codigo_moneda] || ""} {venta.codigo_moneda}
                            </span>
                          </td>
                          <td>
                            <span className="estado-badge" style={{ background: col.bg, color: col.color, borderColor: col.border }}>
                              <span className="estado-badge-dot" style={{ background: col.dot }}></span>
                              {venta.estado_venta}
                            </span>
                          </td>
                          <td>
                            <button className="ver-detail-btn" onClick={(e) => { e.stopPropagation(); handleVerDetalle(venta); }}>
                              <i className="bi bi-eye-fill"></i> Ver
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Cards móvil */}
              <div className="ventas-cards">
                {ventas.map((venta) => {
                  const col = COLORES_ESTADO[venta.estado_venta] || { bg: "#f5f5f5", color: "#9580b0", border: "rgba(0,0,0,0.1)", dot: "#9580b0" };
                  return (
                    <div key={venta.id_venta} className="venta-card" onClick={() => handleVerDetalle(venta)}>
                      <div className="venta-card-top">
                        <div className="venta-card-left">
                          <div className="venta-card-factura">{venta.numero_factura}</div>
                          <div className="venta-card-cliente">{venta.nombre_cliente || "Cliente General"}</div>
                          <div className="venta-card-fecha">{formatDateTime(venta.fecha_venta)}</div>
                        </div>
                        <div>
                          <div className="venta-card-total">{formatCurrency(venta.total, venta.codigo_moneda)}</div>
                          <div style={{ textAlign: "right", marginTop: 3 }}>
                            <span className="moneda-chip">{MONEDA_FLAGS[venta.codigo_moneda] || ""} {venta.codigo_moneda}</span>
                          </div>
                        </div>
                      </div>
                      <div className="venta-card-bottom">
                        <span className="estado-badge" style={{ background: col.bg, color: col.color, borderColor: col.border }}>
                          <span className="estado-badge-dot" style={{ background: col.dot }}></span>
                          {venta.estado_venta}
                        </span>
                        {venta.nombre_usuario && (
                          <span style={{ fontSize: "0.72rem", color: "#9580b0" }}>
                            <i className="bi bi-person me-1"></i>{venta.nombre_usuario}
                          </span>
                        )}
                        <button className="ver-detail-btn" onClick={(e) => { e.stopPropagation(); handleVerDetalle(venta); }}>
                          <i className="bi bi-eye-fill"></i> Ver
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* ── Paginación ── */}
              {totalPages > 1 && (
                <div className="pagination-bar">
                  <div className="pagination-info">
                    Página <strong>{page}</strong> de <strong>{totalPages}</strong>
                    &nbsp;·&nbsp; <strong>{totalRegistros}</strong> ventas en total
                  </div>
                  <div className="pagination-btns">
                    <button className="pg-btn" onClick={() => handlePage(1)} disabled={page === 1} title="Primera página">
                      <i className="bi bi-chevron-double-left"></i>
                    </button>
                    <button className="pg-btn" onClick={() => handlePage(page - 1)} disabled={page === 1} title="Anterior">
                      <i className="bi bi-chevron-left"></i>
                    </button>

                    {paginasVisibles().map((p, i) =>
                      p === '...'
                        ? <span key={`e${i}`} className="pg-ellipsis">…</span>
                        : <button key={p} className={`pg-btn ${p === page ? 'active' : ''}`} onClick={() => handlePage(p)}>{p}</button>
                    )}

                    <button className="pg-btn" onClick={() => handlePage(page + 1)} disabled={page === totalPages} title="Siguiente">
                      <i className="bi bi-chevron-right"></i>
                    </button>
                    <button className="pg-btn" onClick={() => handlePage(totalPages)} disabled={page === totalPages} title="Última página">
                      <i className="bi bi-chevron-double-right"></i>
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <DetalleVentaModal
        show={showModal}
        onHide={() => { setShowModal(false); setVentaSeleccionada(null); }}
        ventaId={ventaSeleccionada}
        onStatusChange={() => { loadVentas(); setShowModal(false); setVentaSeleccionada(null); }}
      />
    </>
  );
};

export default ListaVentasScreen;