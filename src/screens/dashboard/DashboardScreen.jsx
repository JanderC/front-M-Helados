import { useState, useEffect } from 'react';
import { Row, Col, Card, Spinner, Badge } from 'react-bootstrap';
import { reportesService } from '../../api/services/reportesService';
import { cajaService } from '../../api/services/cajaService';
import { formatCurrency } from '../../utils/formatters';
import { useAuth } from '../../hooks/useAuth';

/* ─── helpers seguros ─────────────────────────────── */
const num  = (v) => parseFloat(v)  || 0;
const int  = (v) => parseInt(v)    || 0;
const arr  = (v) => Array.isArray(v) ? v : [];

/* ─── Obtiene ventas de una moneda del array ─────── */
const getMoneda = (data, codigo) => {
  const list = arr(
    data?.ventas_por_moneda ||
    data?.resumen_por_moneda ||
    data?.por_moneda
  );
  return list.find(v => v.codigo_moneda === codigo) || {};
};

/* ─── Stat Card ──────────────────────────────────── */
const StatCard = ({ icon, label, value, sub, accent, delay = 0, dark = false }) => (
  <div className="stat-card-wrap" style={{ animationDelay: `${delay}ms` }}>
    <div className={`stat-card ${dark ? 'dark' : ''}`} style={{ '--accent': accent }}>
      <div className="stat-card-icon">
        <i className={`bi ${icon}`} />
      </div>
      <div className="stat-card-body">
        <div className="stat-label">{label}</div>
        <div className="stat-value">{value}</div>
        {sub && <div className="stat-sub">{sub}</div>}
      </div>
      <div className="stat-card-glow" />
    </div>
  </div>
);

/* ─── Ranking row ────────────────────────────────── */
const RankRow = ({ index, name, count, label = 'vendidos' }) => {
  const medals = ['🥇', '🥈', '🥉'];
  return (
    <div className="rank-row">
      <div className="rank-pos">
        {index < 3 ? (
          <span className="rank-medal">{medals[index]}</span>
        ) : (
          <span className="rank-num">{index + 1}</span>
        )}
      </div>
      <div className="rank-name">{name}</div>
      <div className="rank-count">
        <span className="rank-badge">{count}</span>
        <span className="rank-label">{label}</span>
      </div>
    </div>
  );
};

/* ─── PANTALLA ───────────────────────────────────── */
const DashboardScreen = () => {
  const [loading, setLoading]           = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [estadoCaja, setEstadoCaja]     = useState(null);
  const [error, setError]               = useState(false);
  const { isAdmin, user }               = useAuth();

  useEffect(() => { loadDashboard(); }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError(false);
      const [dashRes, cajaRes] = await Promise.allSettled([
        reportesService.getDashboard({ periodo: 'hoy' }),
        cajaService.getEstado()
      ]);

      if (dashRes.status === 'fulfilled') {
        const d = dashRes.value?.data?.data || dashRes.value?.data;
        console.log('📊 Dashboard data:', d);
        setDashboardData(d || {});
      } else {
        console.error('Dashboard error:', dashRes.reason);
        setDashboardData({});
      }

      if (cajaRes.status === 'fulfilled') {
        const c = cajaRes.value?.data?.data || cajaRes.value?.data;
        setEstadoCaja(c || {});
      } else {
        setEstadoCaja({});
      }
    } catch (err) {
      console.error('Error al cargar dashboard:', err);
      setError(true);
      setDashboardData({});
    } finally {
      setLoading(false);
    }
  };

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="dash-loading">
        <div className="dash-ring" />
        <p>Cargando dashboard...</p>
      </div>
    );
  }

  /* ── Vista despensador ── */
  if (!isAdmin) {
    return (
      <div className="despensador-welcome">
        <div className="despensador-icon">
          <i className="bi bi-cup-straw" />
        </div>
        <h3>¡Hola, {user?.nombre_completo?.split(' ')[0] || 'Despensador'}!</h3>
        <p>Revisa los pedidos activos desde el menú lateral</p>
        <div className="despensador-hint">
          <i className="bi bi-arrow-left-circle me-2" />
          Accede a <strong>Pedidos</strong> para ver las órdenes
        </div>
      </div>
    );
  }

  /* ── Extraer datos con defensas ── */
  const cajaAbierta = estadoCaja?.estado === 'ABIERTA' || estadoCaja?.abierta === true;

  const usd = getMoneda(dashboardData, 'USD');
  const ves = getMoneda(dashboardData, 'VES');
  const cop = getMoneda(dashboardData, 'COP');

  // Totales generales — múltiples rutas posibles según el backend
  const resumen      = dashboardData?.resumen_ventas || dashboardData?.resumen || {};
  const totalVentas  = int(resumen.total_ventas  || dashboardData?.total_ventas);
  const totalUSD     = num(resumen.total_usd     || dashboardData?.total_usd);
  const totalProductos = int(dashboardData?.total_productos || dashboardData?.productos_activos);
  const totalToppings  = int(dashboardData?.total_toppings);

  const productosMasVendidos = arr(dashboardData?.productos_mas_vendidos || dashboardData?.top_productos);
  const toppingsMasUsados    = arr(dashboardData?.toppings_mas_usados    || dashboardData?.top_toppings);
  const inventarioBajo       = arr(dashboardData?.inventario_bajo         || dashboardData?.stock_bajo);

  /* ── Render ── */
  return (
    <>
      <style>{`
        /* ── Animación entrada ── */
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse-glow {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }

        /* ── Loading ── */
        .dash-loading {
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          min-height: 400px; gap: 16px;
          color: var(--brand-purple, #7B2FBE);
          font-family: 'DM Sans', sans-serif; font-size: 0.95rem; font-weight: 500;
        }
        .dash-ring {
          width: 44px; height: 44px; border-radius: 50%;
          border: 3px solid rgba(123,47,190,0.12);
          border-top-color: #7B2FBE;
          animation: spin 0.85s linear infinite;
        }

        /* ── Despensador welcome ── */
        .despensador-welcome {
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          min-height: 55vh; text-align: center; gap: 12px;
          animation: slideUp 0.5s ease;
        }
        .despensador-icon {
          width: 100px; height: 100px; border-radius: 24px;
          background: linear-gradient(135deg, #7B2FBE, #5E1F96);
          display: flex; align-items: center; justify-content: center;
          font-size: 3rem; color: #fff;
          box-shadow: 0 12px 32px rgba(123,47,190,0.35);
          margin-bottom: 8px;
        }
        .despensador-welcome h3 {
          font-family: 'Syne', sans-serif; font-weight: 800;
          font-size: 1.6rem; color: #1a0a2e; margin: 0;
        }
        .despensador-welcome p { color: #94a3b8; font-size: 0.95rem; margin: 0; }
        .despensador-hint {
          display: inline-flex; align-items: center;
          background: rgba(123,47,190,0.08);
          border: 1.5px solid rgba(123,47,190,0.15);
          border-radius: 999px; padding: 8px 18px;
          font-size: 0.85rem; color: #7B2FBE; font-weight: 600;
          margin-top: 8px;
        }

        /* ── Dashboard header ── */
        .dash-header {
          display: flex; align-items: flex-start;
          justify-content: space-between;
          flex-wrap: wrap; gap: 12px; margin-bottom: 28px;
          animation: slideUp 0.4s ease;
        }
        .dash-title {
          font-family: 'Syne', sans-serif; font-weight: 800;
          font-size: clamp(1.4rem, 4vw, 1.9rem);
          color: #1a0a2e; margin: 0; letter-spacing: -0.02em;
        }
        .dash-title i { color: #7B2FBE; }
        .dash-subtitle { font-size: 0.85rem; color: #94a3b8; margin: 2px 0 0; }
        .dash-date-badge {
          display: inline-flex; align-items: center; gap: 6px;
          background: #fff; border: 1.5px solid rgba(123,47,190,0.15);
          border-radius: 999px; padding: 6px 16px;
          font-size: 0.82rem; font-weight: 600; color: #7B2FBE;
          box-shadow: 0 2px 8px rgba(123,47,190,0.08);
        }

        /* ── Caja banner ── */
        .caja-banner {
          border-radius: 16px; padding: 18px 22px;
          display: flex; align-items: center; justify-content: space-between;
          flex-wrap: wrap; gap: 12px;
          margin-bottom: 24px;
          animation: slideUp 0.45s ease;
          position: relative; overflow: hidden;
        }
        .caja-banner.open  { background: linear-gradient(135deg, #15803d, #16a34a, #4DCFBD); }
        .caja-banner.closed { background: linear-gradient(135deg, #991b1b, #dc2626, #f87171); }
        .caja-banner::after {
          content: '';
          position: absolute; right: -20px; top: -20px;
          width: 100px; height: 100px; border-radius: 50%;
          background: rgba(255,255,255,0.08);
        }
        .caja-banner-left { display: flex; align-items: center; gap: 14px; }
        .caja-banner-icon {
          width: 44px; height: 44px; border-radius: 12px;
          background: rgba(255,255,255,0.18);
          display: flex; align-items: center; justify-content: center;
          font-size: 1.4rem; color: #fff; flex-shrink: 0;
        }
        .caja-banner-title {
          font-family: 'Syne', sans-serif; font-weight: 700;
          font-size: 1rem; color: #fff; margin: 0;
        }
        .caja-banner-sub { font-size: 0.78rem; color: rgba(255,255,255,0.75); margin: 2px 0 0; }
        .caja-status-badge {
          background: rgba(255,255,255,0.2) !important;
          border: 1.5px solid rgba(255,255,255,0.35) !important;
          color: #fff !important;
          font-family: 'Syne', sans-serif; font-weight: 800;
          font-size: 0.85rem; letter-spacing: 0.08em;
          padding: 8px 20px !important;
          border-radius: 999px !important;
          backdrop-filter: blur(8px);
        }

        /* ── Stat cards ── */
        .stat-card-wrap {
          animation: slideUp 0.4s ease both;
          height: 100%;
        }
        .stat-card {
          background: #fff;
          border: 1.5px solid rgba(123,47,190,0.08);
          border-radius: 16px;
          padding: 20px;
          display: flex; align-items: flex-start; gap: 16px;
          height: 100%;
          position: relative; overflow: hidden;
          transition: all 0.25s ease;
          box-shadow: 0 2px 10px rgba(123,47,190,0.05);
        }
        .stat-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 24px rgba(123,47,190,0.12);
          border-color: rgba(123,47,190,0.18);
        }
        .stat-card.dark {
          background: linear-gradient(135deg, var(--accent), color-mix(in srgb, var(--accent) 80%, #000));
        }
        .stat-card.dark .stat-label,
        .stat-card.dark .stat-value,
        .stat-card.dark .stat-sub { color: #fff !important; }
        .stat-card.dark .stat-card-icon { background: rgba(255,255,255,0.18); color: #fff; }

        .stat-card-icon {
          width: 48px; height: 48px; border-radius: 13px;
          background: rgba(123,47,190,0.08);
          display: flex; align-items: center; justify-content: center;
          font-size: 1.4rem; color: var(--accent, #7B2FBE);
          flex-shrink: 0;
          transition: transform 0.2s ease;
        }
        .stat-card:hover .stat-card-icon { transform: scale(1.1) rotate(-3deg); }

        .stat-card-body { flex: 1; min-width: 0; }
        .stat-label {
          font-size: 0.75rem; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.06em;
          color: #94a3b8; margin-bottom: 4px;
        }
        .stat-value {
          font-family: 'Syne', sans-serif; font-weight: 800;
          font-size: clamp(1.3rem, 3.5vw, 1.75rem);
          color: var(--accent, #7B2FBE); line-height: 1.1;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .stat-sub { font-size: 0.75rem; color: #b0a0c8; margin-top: 4px; font-weight: 500; }

        .stat-card-glow {
          position: absolute; top: -30px; right: -30px;
          width: 80px; height: 80px; border-radius: 50%;
          background: radial-gradient(circle, var(--accent, rgba(123,47,190,0.15)), transparent 70%);
          opacity: 0.3; pointer-events: none;
          animation: pulse-glow 3s ease infinite;
        }

        /* ── Moneda cards (grandes con gradiente) ── */
        .moneda-card {
          border-radius: 18px; padding: 22px 20px;
          color: #fff; height: 100%; position: relative; overflow: hidden;
          animation: slideUp 0.4s ease both;
          transition: transform 0.25s ease, box-shadow 0.25s ease;
          box-shadow: 0 4px 20px rgba(0,0,0,0.12);
        }
        .moneda-card:hover { transform: translateY(-4px); box-shadow: 0 12px 36px rgba(0,0,0,0.18); }
        .moneda-card.usd { background: linear-gradient(135deg, #15803d 0%, #16a34a 60%, #4DCFBD 100%); }
        .moneda-card.ves { background: linear-gradient(135deg, #0369a1 0%, #0284c7 60%, #38bdf8 100%); }
        .moneda-card.cop { background: linear-gradient(135deg, #92400e 0%, #b45309 60%, #f59e0b 100%); }
        .moneda-card::before {
          content: '';
          position: absolute; top: -30px; right: -30px;
          width: 120px; height: 120px; border-radius: 50%;
          background: rgba(255,255,255,0.1);
        }
        .moneda-card::after {
          content: '';
          position: absolute; bottom: -20px; left: 20px;
          width: 80px; height: 80px; border-radius: 50%;
          background: rgba(255,255,255,0.06);
        }
        .moneda-card-icon {
          width: 44px; height: 44px; border-radius: 12px;
          background: rgba(255,255,255,0.2);
          display: flex; align-items: center; justify-content: center;
          font-size: 1.4rem; margin-bottom: 14px;
          backdrop-filter: blur(8px);
        }
        .moneda-label { font-size: 0.75rem; font-weight: 700; opacity: 0.8; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 4px; }
        .moneda-value {
          font-family: 'Syne', sans-serif; font-weight: 800;
          font-size: clamp(1.25rem, 3.5vw, 1.8rem);
          line-height: 1.1; margin-bottom: 6px;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .moneda-count { font-size: 0.78rem; opacity: 0.75; font-weight: 500; }

        /* ── Ranking cards ── */
        .rank-card {
          border-radius: 16px; background: #fff;
          border: 1.5px solid rgba(123,47,190,0.08);
          box-shadow: 0 2px 10px rgba(123,47,190,0.05);
          overflow: hidden; height: 100%;
          animation: slideUp 0.5s ease both;
        }
        .rank-card-header {
          display: flex; align-items: center; gap: 12px;
          padding: 16px 18px; border-bottom: 1px solid rgba(123,47,190,0.07);
          background: #faf8fe;
        }
        .rank-card-header-icon {
          width: 38px; height: 38px; border-radius: 10px;
          display: flex; align-items: center; justify-content: center; font-size: 1.1rem;
        }
        .rank-title {
          font-family: 'Syne', sans-serif; font-weight: 700;
          font-size: 0.95rem; color: #1a0a2e; margin: 0;
        }
        .rank-subtitle { font-size: 0.72rem; color: #94a3b8; margin: 1px 0 0; }

        .rank-body { padding: 6px 0; }
        .rank-row {
          display: flex; align-items: center; gap: 12px;
          padding: 10px 18px; transition: background 0.15s ease;
        }
        .rank-row:hover { background: rgba(123,47,190,0.04); }
        .rank-pos { width: 28px; text-align: center; flex-shrink: 0; }
        .rank-medal { font-size: 1.1rem; }
        .rank-num {
          display: inline-flex; align-items: center; justify-content: center;
          width: 24px; height: 24px; border-radius: 50%;
          background: rgba(123,47,190,0.08);
          font-size: 0.75rem; font-weight: 700; color: #7B2FBE;
        }
        .rank-name {
          flex: 1; font-size: 0.88rem; font-weight: 600;
          color: #1a0a2e; min-width: 0;
          white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }
        .rank-count { display: flex; align-items: center; gap: 5px; flex-shrink: 0; }
        .rank-badge {
          display: inline-flex; align-items: center; justify-content: center;
          background: linear-gradient(135deg, #7B2FBE, #5E1F96);
          color: #fff; border-radius: 6px;
          padding: 3px 10px; font-size: 0.78rem; font-weight: 700;
          font-family: 'Syne', sans-serif;
        }
        .rank-label { font-size: 0.7rem; color: #b0a0c8; font-weight: 500; }
        .rank-empty {
          display: flex; flex-direction: column; align-items: center;
          padding: 2rem; gap: 8px; color: #c4b0d8;
        }
        .rank-empty i { font-size: 2rem; opacity: 0.4; }
        .rank-empty p { font-size: 0.82rem; margin: 0; }

        /* ── Stock bajo ── */
        .stock-alert-card {
          border-radius: 16px; background: #fff;
          border: 1.5px solid rgba(245,158,11,0.2);
          border-left: 4px solid #f59e0b;
          box-shadow: 0 2px 12px rgba(245,158,11,0.08);
          margin-bottom: 24px;
          animation: slideUp 0.45s ease;
        }
        .stock-alert-header {
          display: flex; align-items: center; gap: 12px;
          padding: 14px 18px; border-bottom: 1px solid rgba(245,158,11,0.1);
          background: rgba(245,158,11,0.04);
        }
        .stock-alert-icon {
          width: 36px; height: 36px; border-radius: 10px;
          background: rgba(245,158,11,0.12);
          display: flex; align-items: center; justify-content: center;
          font-size: 1.1rem; color: #b45309;
        }
        .stock-alert-title {
          font-family: 'Syne', sans-serif; font-weight: 700;
          font-size: 0.95rem; color: #1a0a2e; margin: 0;
        }
        .stock-alert-sub { font-size: 0.72rem; color: #94a3b8; margin: 1px 0 0; }
        .stock-table { width: 100%; }
        .stock-table th {
          font-size: 0.7rem; font-weight: 700; text-transform: uppercase;
          letter-spacing: 0.07em; color: #94a3b8; padding: 10px 18px;
          border: none; background: transparent;
        }
        .stock-table td { padding: 10px 18px; font-size: 0.875rem; border: none; border-top: 1px solid rgba(123,47,190,0.05); }
        .stock-table tr:hover td { background: rgba(245,158,11,0.03); }
        .stock-name { font-weight: 600; color: #1a0a2e; }
        .stock-badge-low {
          display: inline-flex; align-items: center;
          background: rgba(239,68,68,0.1); color: #dc2626;
          border: 1px solid rgba(239,68,68,0.2);
          border-radius: 6px; padding: 3px 10px;
          font-size: 0.78rem; font-weight: 700;
        }
        .stock-min { color: #94a3b8; font-size: 0.82rem; }

        /* ── Separador de sección ── */
        .section-label {
          font-family: 'DM Sans', sans-serif; font-size: 0.68rem;
          font-weight: 700; text-transform: uppercase;
          letter-spacing: 0.1em; color: #c4b0d8;
          margin-bottom: 10px; padding-left: 2px;
        }
      `}</style>

      {/* ── Header ── */}
      <div className="dash-header">
        <div>
          <h2 className="dash-title">
            <i className="bi bi-speedometer2 me-2" />
            Dashboard
          </h2>
          <p className="dash-subtitle">Resumen operativo del día</p>
        </div>
        <div className="dash-date-badge">
          <i className="bi bi-calendar-check" />
          {new Date().toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}
        </div>
      </div>

      {/* ── Estado de caja ── */}
      <div className={`caja-banner ${cajaAbierta ? 'open' : 'closed'}`}>
        <div className="caja-banner-left">
          <div className="caja-banner-icon">
            <i className={`bi ${cajaAbierta ? 'bi-cash-stack' : 'bi-lock-fill'}`} />
          </div>
          <div>
            <p className="caja-banner-title">Estado de Caja</p>
            <p className="caja-banner-sub">
              {cajaAbierta
                ? `Operaciones activas${estadoCaja?.fecha_apertura ? ' desde las ' + new Date(estadoCaja.fecha_apertura).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : ''}`
                : 'Sin operaciones activas'}
            </p>
          </div>
        </div>
        <Badge className="caja-status-badge">
          {cajaAbierta ? '✓ ABIERTA' : '✗ CERRADA'}
        </Badge>
      </div>

      {/* ── Tarjetas por moneda ── */}
      <p className="section-label">Ventas del día por moneda</p>
      <Row className="g-3 mb-4">
        <Col xs={12} sm={6} lg={4}>
          <div className="moneda-card usd" style={{ animationDelay: '0ms' }}>
            <div className="moneda-card-icon">
              <i className="bi bi-currency-dollar" />
            </div>
            <div className="moneda-label">Dólares (USD)</div>
            <div className="moneda-value">
              {formatCurrency(num(usd.total_moneda || usd.total), 'USD')}
            </div>
            <div className="moneda-count">
              {int(usd.total_ventas || usd.cantidad)} {int(usd.total_ventas || usd.cantidad) === 1 ? 'venta' : 'ventas'}
            </div>
          </div>
        </Col>
        <Col xs={12} sm={6} lg={4}>
          <div className="moneda-card ves" style={{ animationDelay: '60ms' }}>
            <div className="moneda-card-icon">
              <i className="bi bi-cash-coin" />
            </div>
            <div className="moneda-label">Bolívares (VES)</div>
            <div className="moneda-value">
              {formatCurrency(num(ves.total_moneda || ves.total), 'VES')}
            </div>
            <div className="moneda-count">
              {int(ves.total_ventas || ves.cantidad)} {int(ves.total_ventas || ves.cantidad) === 1 ? 'venta' : 'ventas'}
            </div>
          </div>
        </Col>
        <Col xs={12} sm={6} lg={4}>
          <div className="moneda-card cop" style={{ animationDelay: '120ms' }}>
            <div className="moneda-card-icon">
              <i className="bi bi-cash" />
            </div>
            <div className="moneda-label">Pesos (COP)</div>
            <div className="moneda-value">
              {formatCurrency(num(cop.total_moneda || cop.total), 'COP')}
            </div>
            <div className="moneda-count">
              {int(cop.total_ventas || cop.cantidad)} {int(cop.total_ventas || cop.cantidad) === 1 ? 'venta' : 'ventas'}
            </div>
          </div>
        </Col>
      </Row>

      {/* ── Stats generales ── */}
      <p className="section-label">Estadísticas generales</p>
      <Row className="g-3 mb-4">
        <Col xs={6} lg={3}>
          <StatCard
            icon="bi-bag-check-fill"
            label="Pedidos Hoy"
            value={totalVentas}
            accent="#7B2FBE"
            delay={0}
          />
        </Col>
        <Col xs={6} lg={3}>
          <StatCard
            icon="bi-currency-exchange"
            label="Total en USD"
            value={formatCurrency(totalUSD, 'USD')}
            accent="#7B2FBE"
            delay={60}
          />
        </Col>
        <Col xs={6} lg={3}>
          <StatCard
            icon="bi-box-seam-fill"
            label="Productos"
            value={totalProductos || '—'}
            accent="#16a34a"
            delay={120}
          />
        </Col>
        <Col xs={6} lg={3}>
          <StatCard
            icon="bi-stars"
            label="Toppings"
            value={totalToppings || '—'}
            accent="#b45309"
            delay={180}
          />
        </Col>
      </Row>

      {/* ── Alerta stock bajo ── */}
      {inventarioBajo.length > 0 && (
        <>
          <p className="section-label">Alertas de inventario</p>
          <div className="stock-alert-card">
            <div className="stock-alert-header">
              <div className="stock-alert-icon">
                <i className="bi bi-exclamation-triangle-fill" />
              </div>
              <div>
                <p className="stock-alert-title">Stock Bajo</p>
                <p className="stock-alert-sub">{inventarioBajo.length} producto{inventarioBajo.length !== 1 ? 's' : ''} requieren reabastecimiento</p>
              </div>
            </div>
            <div className="table-responsive">
              <table className="stock-table">
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Stock actual</th>
                    <th className="d-none d-sm-table-cell">Mínimo</th>
                  </tr>
                </thead>
                <tbody>
                  {inventarioBajo.map((prod, i) => (
                    <tr key={i}>
                      <td className="stock-name">
                        {prod.nombre_topping || prod.nombre_producto || prod.nombre}
                      </td>
                      <td>
                        <span className="stock-badge-low">
                          <i className="bi bi-exclamation-circle me-1" style={{ fontSize: '0.7rem' }} />
                          {prod.stock_actual ?? prod.stock ?? '—'}
                        </span>
                      </td>
                      <td className="stock-min d-none d-sm-table-cell">
                        {prod.stock_minimo ?? prod.minimo ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ── Rankings ── */}
      <p className="section-label">Rankings del día</p>
      <Row className="g-3">
        <Col xs={12} lg={6}>
          <div className="rank-card">
            <div className="rank-card-header">
              <div className="rank-card-header-icon" style={{ background: 'rgba(245,158,11,0.1)' }}>
                <i className="bi bi-trophy-fill" style={{ color: '#b45309' }} />
              </div>
              <div>
                <p className="rank-title">Top Productos</p>
                <p className="rank-subtitle">Más vendidos hoy</p>
              </div>
            </div>
            <div className="rank-body">
              {productosMasVendidos.length === 0 ? (
                <div className="rank-empty">
                  <i className="bi bi-bag-x" />
                  <p>Sin ventas registradas hoy</p>
                </div>
              ) : (
                productosMasVendidos.map((p, i) => (
                  <RankRow
                    key={i} index={i}
                    name={p.nombre_producto || p.nombre || '—'}
                    count={int(p.cantidad || p.total_vendidos)}
                    label="vendidos"
                  />
                ))
              )}
            </div>
          </div>
        </Col>

        <Col xs={12} lg={6}>
          <div className="rank-card" style={{ animationDelay: '80ms' }}>
            <div className="rank-card-header">
              <div className="rank-card-header-icon" style={{ background: 'rgba(123,47,190,0.08)' }}>
                <i className="bi bi-stars" style={{ color: '#7B2FBE' }} />
              </div>
              <div>
                <p className="rank-title">Top Toppings</p>
                <p className="rank-subtitle">Más usados hoy</p>
              </div>
            </div>
            <div className="rank-body">
              {toppingsMasUsados.length === 0 ? (
                <div className="rank-empty">
                  <i className="bi bi-stars" />
                  <p>Sin toppings registrados hoy</p>
                </div>
              ) : (
                toppingsMasUsados.map((t, i) => (
                  <RankRow
                    key={i} index={i}
                    name={t.nombre_topping || t.nombre || '—'}
                    count={int(t.cantidad || t.total_usados)}
                    label="usados"
                  />
                ))
              )}
            </div>
          </div>
        </Col>
      </Row>
    </>
  );
};

export default DashboardScreen;