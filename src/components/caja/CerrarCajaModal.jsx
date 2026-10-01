import { useState, useEffect } from 'react';
import { Modal, Spinner, Table, Badge } from 'react-bootstrap';
import { cajaService } from '../../api/services/cajaService';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { toast } from 'react-toastify';

/* ─── helpers ─────────────────────────────────────── */
const num = (v) => parseFloat(v) || 0;
const redondear = (v) => Math.round(v * 100) / 100;

const MONEDAS_INFO = [
  { cod: 'COP', label: 'Pesos Colombianos', icon: 'bi-cash',            color: '#92400e', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.3)' },
  { cod: 'USD', label: 'Dólares',           icon: 'bi-currency-dollar', color: '#15803d', bg: 'rgba(34,197,94,0.07)',  border: 'rgba(34,197,94,0.3)'  },
  { cod: 'VES', label: 'Bolívares',         icon: 'bi-cash-coin',       color: '#1d4ed8', bg: 'rgba(59,130,246,0.07)', border: 'rgba(59,130,246,0.3)' },
];

/**
 * CerrarCajaModal
 * Todo el cuadre sale de GET /api/caja/estado, que solo cuenta las ventas y
 * movimientos registrados en la caja abierta (no las del día calendario).
 *
 * Props:
 *  - show: boolean
 *  - onHide: fn
 *  - estadoCaja: objeto retornado por GET /api/caja/estado
 *      estadoCaja.ventas_dia = { total_cop, total_usd_original, total_ves, total_usd, total_ventas }
 *      estadoCaja.efectivo   = { COP|USD|VES: { inicial, ventas, ventas_efectivo, ingresos, egresos, esperado } }
 *      estadoCaja.desglose_metodos_pago = [{ codigo, nombre, icono, codigo_moneda, total, cantidad_ventas }]
 *      estadoCaja.ventas_pendientes = ventas sin completar de esta caja
 *  - onSuccess: fn callback tras cerrar con éxito
 */
const CerrarCajaModal = ({ show, onHide, estadoCaja, onSuccess }) => {
  const [cerrando, setCerrando]         = useState(false);
  const [observaciones, setObservaciones] = useState('');
  const [mostrarVentas, setMostrarVentas] = useState(false);

  // Estado de caja recién consultado y ventas del turno
  const [caja, setCaja]               = useState(estadoCaja);
  const [ventasTurno, setVentasTurno] = useState([]);
  const [cargando, setCargando]       = useState(false);

  // Montos finales reales que ingresa el cajero
  const [finalCOP, setFinalCOP] = useState('');
  const [finalUSD, setFinalUSD] = useState('');
  const [finalVES, setFinalVES] = useState('');

  // Al abrir el modal: limpiar y volver a pedir el estado, para cuadrar
  // contra las ventas de este momento y no contra datos viejos en pantalla
  useEffect(() => {
    if (!show) return;

    setFinalCOP('');
    setFinalUSD('');
    setFinalVES('');
    setObservaciones('');
    setMostrarVentas(false);
    setVentasTurno([]);
    setCaja(estadoCaja);

    let vigente = true;
    const cargar = async () => {
      try {
        setCargando(true);
        const estadoRes = await cajaService.getEstado();
        const cajaActual = estadoRes.data?.data;
        if (!vigente || !cajaActual) return;
        setCaja(cajaActual);
        const ventasRes = await cajaService.getVentasPorArqueo(cajaActual.id_arqueo);
        if (vigente) setVentasTurno(ventasRes.data?.data?.ventas || []);
      } catch (err) {
        console.error('Error al actualizar el estado de caja:', err);
      } finally {
        if (vigente) setCargando(false);
      }
    };
    cargar();

    return () => { vigente = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show]);

  const ventasDia          = caja?.ventas_dia || {};
  const totalVentas        = parseInt(ventasDia.total_ventas) || 0;
  const totalUSDRef        = num(ventasDia.total_usd);
  const ventasPendientes   = parseInt(caja?.ventas_pendientes) || 0;
  const desglosePagosData  = caja?.desglose_metodos_pago || [];

  const valores = { COP: finalCOP, USD: finalUSD, VES: finalVES };
  const setters = { COP: setFinalCOP, USD: setFinalUSD, VES: setFinalVES };

  /* ── Cuadre por moneda:
        esperado = inicial + ventas en efectivo + ingresos − egresos ── */
  const monedas = MONEDAS_INFO.map((info) => {
    const sufijo   = info.cod.toLowerCase();
    const efectivo = caja?.efectivo?.[info.cod];
    const inicial  = num(caja?.[`monto_inicial_${sufijo}`]);
    const ventas   = efectivo
      ? num(efectivo.ventas)
      : num(info.cod === 'USD' ? ventasDia.total_usd_original : ventasDia[`total_${sufijo}`]);
    const ventasEfectivo = efectivo ? num(efectivo.ventas_efectivo) : ventas;
    const ingresos = num(efectivo?.ingresos);
    const egresos  = num(efectivo?.egresos);
    const esperado = efectivo ? num(efectivo.esperado) : inicial + ventas;
    const val      = valores[info.cod];

    return {
      ...info,
      inicial, ventas, ventasEfectivo, ingresos, egresos, esperado,
      otrosMedios: redondear(ventas - ventasEfectivo),
      val,
      setVal: setters[info.cod],
      dif: val !== '' ? redondear(num(val) - esperado) : null,
    };
  });

  /* ── Monedas activas (tienen inicial, ventas o movimientos) ── */
  const monedasActivas = monedas.filter(m => m.inicial > 0 || m.ventas > 0 || m.ingresos > 0 || m.egresos > 0);
  const monedasMostrar = monedasActivas.length > 0 ? monedasActivas : [monedas[0]];

  /* ── Cerrar caja ── */
  const handleCerrar = async () => {
    if (ventasPendientes > 0) {
      toast.warning('Completa o cancela las ventas pendientes antes de cerrar');
      return;
    }
    if (monedasActivas.some(m => m.val === '')) {
      toast.warning('Ingresa el monto contado para cada moneda con actividad');
      return;
    }

    try {
      setCerrando(true);
      const response = await cajaService.cerrar(
        { cop: finalCOP, usd: finalUSD, ves: finalVES },
        observaciones.trim()
      );

      if (response.data?.success) {
        toast.success('✅ Caja cerrada correctamente');
        onHide();
        onSuccess?.();
      } else {
        toast.error(response.data?.message || 'Error al cerrar caja');
      }
    } catch (err) {
      console.error('Error al cerrar caja:', err);
      toast.error(err.response?.data?.message || 'Error al cerrar caja');
    } finally {
      setCerrando(false);
    }
  };

  // FIX: colores de estado de venta reutilizados en el modal
  const colorEstado = {
    COMPLETADA: 'success',
    PENDIENTE:  'warning',
    EN_PROCESO: 'info',
    CANCELADA:  'danger',
  };

  return (
    <>
      <style>{`
        /* ── Modal tamaño y forma ── */
        .cerrar-modal .modal-dialog {
          max-width: 860px !important;
        }
        .cerrar-modal .modal-content {
          border-radius: 18px !important;
          border: none !important;
          box-shadow: 0 20px 60px rgba(0,0,0,0.18) !important;
          overflow: hidden;
          font-family: 'DM Sans', sans-serif;
        }

        /* ── Header ── */
        .cm-header {
          background: linear-gradient(135deg, #7B1212, #dc2626);
          padding: 18px 24px;
          display: flex; align-items: center; justify-content: space-between;
        }
        .cm-header-left { display: flex; align-items: center; gap: 12px; }
        .cm-header-icon {
          width: 44px; height: 44px; border-radius: 11px;
          background: rgba(255,255,255,0.15);
          display: flex; align-items: center; justify-content: center;
          font-size: 1.3rem; color: #fff;
        }
        .cm-header-title { font-family: 'Syne', sans-serif; font-weight: 800; font-size: 1.1rem; color: #fff; margin: 0; }
        .cm-header-sub { font-size: 0.78rem; color: rgba(255,255,255,0.7); margin: 2px 0 0; }
        .cm-close {
          width: 34px; height: 34px; border-radius: 8px;
          background: rgba(255,255,255,0.15); border: none; color: #fff;
          cursor: pointer; display: flex; align-items: center; justify-content: center;
          font-size: 1.1rem; transition: background 0.15s;
        }
        .cm-close:hover { background: rgba(255,255,255,0.28); }

        /* ── Body ── */
        .cm-body {
          padding: 22px 24px;
          max-height: 78vh;
          overflow-y: auto;
        }

        /* ── Alerta ── */
        .cm-alert {
          display: flex; gap: 10px; align-items: flex-start;
          background: rgba(245,158,11,0.08); border: 1px solid rgba(245,158,11,0.25);
          border-radius: 11px; padding: 12px 14px; margin-bottom: 20px;
          font-size: 0.84rem; color: #92400e;
        }
        .cm-alert i { font-size: 1rem; flex-shrink: 0; margin-top: 1px; }
        .cm-alert.pendientes {
          background: rgba(239,68,68,0.08); border-color: rgba(239,68,68,0.3); color: #b91c1c;
        }

        /* ── Layout 2 columnas ── */
        .cm-two-col {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 20px;
        }
        @media (max-width: 600px) {
          .cm-two-col { grid-template-columns: 1fr; }
          .cerrar-modal .modal-dialog { max-width: 98vw !important; }
        }

        /* ── Info del turno ── */
        .cm-info-box {
          background: #f8f7ff;
          border: 1px solid rgba(123,47,190,0.1);
          border-radius: 13px;
          padding: 16px;
        }
        .cm-info-box-title {
          font-size: 0.66rem; font-weight: 800; text-transform: uppercase;
          letter-spacing: 0.1em; color: #9580b0; margin-bottom: 12px;
          display: flex; align-items: center; gap: 8px;
        }
        .cm-info-box-title::after { content:''; flex:1; height:1px; background:rgba(123,47,190,0.12); }
        .cm-info-row {
          display: flex; justify-content: space-between; align-items: center;
          padding: 7px 0; border-bottom: 1px solid rgba(123,47,190,0.07);
          font-size: 0.84rem;
        }
        .cm-info-row:last-child { border-bottom: none; padding-bottom: 0; }
        .cm-info-row-label { color: #6b7280; font-weight: 600; }
        .cm-info-row-val { font-weight: 700; color: #1a0a2e; text-align: right; max-width: 55%; word-break: break-word; }

        /* Chip de ventas */
        .cm-ventas-chip {
          background: rgba(123,47,190,0.1); color: #7B2FBE;
          border-radius: 6px; padding: 3px 10px;
          font-weight: 800; font-family: 'Syne', sans-serif; font-size: 0.875rem;
        }

        /* ── Resumen por moneda / por método de pago ── */
        .cm-resumen-box {
          background: #f8f7ff;
          border: 1px solid rgba(123,47,190,0.1);
          border-radius: 13px;
          padding: 16px;
        }
        .cm-resumen-monedas { display: flex; flex-direction: column; gap: 10px; }

        .cm-resumen-row {
          background: #fff;
          border-radius: 11px;
          border: 1px solid rgba(123,47,190,0.1);
          overflow: hidden;
        }
        .cm-resumen-tag {
          padding: 8px 14px;
          font-family: 'Syne', sans-serif; font-weight: 800; font-size: 0.78rem;
          display: flex; align-items: center; gap: 8px;
          border-bottom: 1px solid rgba(123,47,190,0.08);
        }
        .tag-COP { background: rgba(245,158,11,0.12); color: #92400e; }
        .tag-USD { background: rgba(34,197,94,0.12);  color: #15803d; }
        .tag-VES { background: rgba(59,130,246,0.12); color: #1d4ed8; }
        .tag-METODO { background: rgba(123,47,190,0.1); color: #7B2FBE; }

        .cm-resumen-cells {
          display: flex;
          flex-direction: column;
          padding: 4px 0;
        }
        .cm-resumen-cell {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 7px 14px;
          border-bottom: 1px solid rgba(123,47,190,0.05);
        }
        .cm-resumen-cell:last-child { border-bottom: none; }
        .cm-resumen-cell-label {
          font-size: 0.78rem; font-weight: 600;
          color: #6b7280;
          white-space: nowrap;
          flex-shrink: 0;
        }
        .cm-resumen-cell-val {
          font-family: 'Syne', sans-serif; font-weight: 800;
          font-size: 0.92rem; color: #1a0a2e;
          text-align: right;
        }
        .cm-resumen-cell-val.ventas  { color: #15803d; }
        .cm-resumen-cell-val.egresos { color: #dc2626; }
        .cm-resumen-cell-val.esperado { color: #7B2FBE; font-size: 1rem; }

        /* ── Separadores ── */
        .cm-section-title {
          font-size: 0.66rem; font-weight: 800; text-transform: uppercase;
          letter-spacing: 0.1em; color: #9580b0; margin: 20px 0 10px;
          display: flex; align-items: center; gap: 8px;
        }
        .cm-section-title::after { content:''; flex:1; height:1px; background:rgba(123,47,190,0.1); }

        /* ── Desglose por método de pago (grid) ── */
        .cm-metodos-grid {
          display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 10px; margin-bottom: 20px;
        }

        /* ── Conteo físico ── */
        .cm-monto-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 12px; margin-bottom: 4px; }
        .cm-monto-card {
          border-radius: 13px; padding: 14px 16px;
          border: 1.5px solid;
        }
        .cm-monto-card-header {
          display: flex; align-items: center; gap: 10px; margin-bottom: 10px;
          flex-wrap: wrap;
        }
        .cm-monto-icon {
          width: 36px; height: 36px; border-radius: 9px;
          display: flex; align-items: center; justify-content: center;
          font-size: 1rem; flex-shrink: 0;
        }
        .cm-monto-label { font-family: 'Syne', sans-serif; font-weight: 700; font-size: 0.88rem; color: #1a0a2e; }
        .cm-monto-cod { font-size: 0.72rem; color: #94a3b8; margin-top: 1px; }
        .cm-monto-esperado { margin-left: auto; text-align: right; }
        .cm-monto-esp-label { font-size: 0.62rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #94a3b8; }
        .cm-monto-esp-val {
          font-family: 'Syne', sans-serif; font-weight: 800;
          font-size: 0.95rem; color: #7B2FBE;
          word-break: break-all;
        }

        .cm-input-row { display: flex; gap: 10px; align-items: flex-end; }
        .cm-input-wrap { flex: 1; }
        .cm-input-lbl {
          font-size: 0.66rem; font-weight: 700; text-transform: uppercase;
          letter-spacing: 0.06em; color: #94a3b8; margin-bottom: 5px; display: block;
        }
        .cm-input {
          width: 100%; padding: 12px 14px; border-radius: 10px;
          font-family: 'Syne', sans-serif; font-weight: 700; font-size: 1.05rem;
          border: 1.5px solid rgba(123,47,190,0.2); outline: none;
          transition: border-color 0.15s ease; background: #fff;
        }
        .cm-input:focus { border-color: #7B2FBE; box-shadow: 0 0 0 3px rgba(123,47,190,0.08); }

        /* ── Diferencia ── */
        .cm-dif {
          display: flex; justify-content: space-between; align-items: center;
          padding: 8px 12px; border-radius: 8px; margin-top: 8px; font-size: 0.82rem;
        }
        .cm-dif.ok  { background: rgba(34,197,94,0.08); }
        .cm-dif.neg { background: rgba(239,68,68,0.08); }
        .cm-dif-label { font-weight: 700; }
        .cm-dif-label.ok  { color: #15803d; }
        .cm-dif-label.neg { color: #dc2626; }
        .cm-dif-val { font-family: 'Syne', sans-serif; font-weight: 800; }
        .cm-dif-val.ok  { color: #15803d; }
        .cm-dif-val.neg { color: #dc2626; }

        /* ── Observaciones ── */
        .cm-obs-textarea {
          width: 100%; padding: 11px 14px; border-radius: 10px;
          font-family: 'DM Sans', sans-serif; font-size: 0.875rem;
          border: 1.5px solid rgba(123,47,190,0.15); outline: none; resize: vertical;
          min-height: 72px; transition: border-color 0.15s; background: #fff;
        }
        .cm-obs-textarea:focus { border-color: #7B2FBE; box-shadow: 0 0 0 3px rgba(123,47,190,0.08); }

        /* ── Footer ── */
        .cm-footer {
          padding: 16px 24px; border-top: 1px solid rgba(123,47,190,0.08);
          background: #faf8fe; display: flex; gap: 10px;
        }
        .cm-btn-cancel {
          flex: 1; padding: 13px; border-radius: 11px;
          border: 1.5px solid rgba(123,47,190,0.2); background: #fff;
          color: #7B2FBE; font-family: 'DM Sans', sans-serif; font-weight: 700;
          cursor: pointer; transition: background 0.15s; font-size: 0.9rem;
        }
        .cm-btn-cancel:hover { background: rgba(123,47,190,0.04); }
        .cm-btn-cerrar {
          flex: 2; padding: 13px; border-radius: 11px; border: none;
          background: linear-gradient(135deg, #7B1212, #dc2626);
          color: #fff; font-family: 'Syne', sans-serif; font-weight: 800;
          font-size: 0.95rem; cursor: pointer;
          box-shadow: 0 4px 14px rgba(220,38,38,0.35);
          display: flex; align-items: center; justify-content: center; gap: 8px;
          transition: filter 0.15s, transform 0.15s;
        }
        .cm-btn-cerrar:hover:not(:disabled) { filter: brightness(1.06); transform: translateY(-1px); }
        .cm-btn-cerrar:disabled { opacity: 0.55; cursor: not-allowed; transform: none; }

        /* ── Ventas toggle ── */
        .cm-ventas-toggle {
          background: none; border: 1.5px solid rgba(123,47,190,0.2);
          border-radius: 9px; padding: 7px 14px; font-size: 0.82rem; font-weight: 700;
          color: #7B2FBE; cursor: pointer; display: flex; align-items: center; gap: 6px;
          transition: background 0.15s;
        }
        .cm-ventas-toggle:hover { background: rgba(123,47,190,0.05); }
        .cm-ventas-table-wrap {
          border-radius: 11px; border: 1px solid rgba(123,47,190,0.1);
          overflow: hidden; margin-top: 10px;
        }
        .cm-ventas-table-wrap .table { margin-bottom: 0; font-size: 0.82rem; }
        .cm-ventas-table-wrap .table thead th { background: #f8f7ff; font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.06em; color: #9580b0; }
      `}</style>

      <Modal show={show} onHide={onHide} centered className="cerrar-modal" backdrop="static" size="xl">
        <div style={{ fontFamily: 'DM Sans, sans-serif' }}>

          {/* ── Header ── */}
          <div className="cm-header">
            <div className="cm-header-left">
              <div className="cm-header-icon"><i className="bi bi-lock-fill"/></div>
              <div>
                <p className="cm-header-title">Cerrar Caja</p>
                <p className="cm-header-sub">Arqueo y cierre del turno</p>
              </div>
            </div>
            <button className="cm-close" onClick={onHide}><i className="bi bi-x"/></button>
          </div>

          {/* ── Body ── */}
          <div className="cm-body">

            {/* Alerta */}
            <div className="cm-alert">
              <i className="bi bi-exclamation-triangle-fill"/>
              <span>Al cerrar la caja se realizará el arqueo y no podrás realizar más transacciones hasta abrir una nueva caja.</span>
            </div>

            {ventasPendientes > 0 && (
              <div className="cm-alert pendientes">
                <i className="bi bi-hourglass-split"/>
                <span>
                  Hay {ventasPendientes} {ventasPendientes === 1 ? 'venta pendiente' : 'ventas pendientes'} en esta caja.
                  Complétalas o cancélalas en la lista de ventas para poder cerrar.
                </span>
              </div>
            )}

            {/* ── Fila 2 columnas: Info del turno + Resumen por moneda ── */}
            <div className="cm-two-col">

              {/* Info del turno */}
              <div className="cm-info-box">
                <div className="cm-info-box-title">Información del turno</div>
                <div className="cm-info-row">
                  <span className="cm-info-row-label">Fecha Apertura</span>
                  <span className="cm-info-row-val">
                    {caja?.fecha_apertura ? formatDateTime(caja.fecha_apertura) : '—'}
                  </span>
                </div>
                <div className="cm-info-row">
                  <span className="cm-info-row-label">Responsable</span>
                  <span className="cm-info-row-val">{caja?.usuario_apertura || '—'}</span>
                </div>
                <div className="cm-info-row">
                  <span className="cm-info-row-label">Ventas de esta caja</span>
                  <span className="cm-ventas-chip">
                    {totalVentas} {totalVentas === 1 ? 'venta' : 'ventas'}
                  </span>
                </div>
                {totalUSDRef > 0 && (
                  <div className="cm-info-row">
                    <span className="cm-info-row-label">Equivalente USD</span>
                    <span className="cm-info-row-val" style={{ color: '#15803d' }}>
                      {formatCurrency(totalUSDRef, 'USD')}
                    </span>
                  </div>
                )}
                {/* Montos iniciales */}
                {monedas.some(m => m.inicial > 0) && (
                  <>
                    <div className="cm-info-row" style={{ marginTop: 6, borderTop: '1px solid rgba(123,47,190,0.1)', paddingTop: 10 }}>
                      <span className="cm-info-row-label" style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Montos iniciales</span>
                    </div>
                    {monedas.filter(m => m.inicial > 0).map(m => (
                      <div key={m.cod} className="cm-info-row">
                        <span className="cm-info-row-label">{m.cod}</span>
                        <span className="cm-info-row-val">{formatCurrency(m.inicial, m.cod)}</span>
                      </div>
                    ))}
                  </>
                )}
              </div>

              {/* Resumen por moneda */}
              <div className="cm-resumen-box">
                <div className="cm-info-box-title">Resumen por moneda</div>
                <div className="cm-resumen-monedas">
                  {monedasMostrar.map(m => (
                    <div key={m.cod} className="cm-resumen-row">
                      <div className={`cm-resumen-tag tag-${m.cod}`}>
                        <i className={`bi ${m.icon}`} style={{ fontSize: '0.85rem' }}/>
                        {m.label}
                      </div>
                      <div className="cm-resumen-cells">
                        <div className="cm-resumen-cell">
                          <div className="cm-resumen-cell-label">Monto Inicial</div>
                          <div className="cm-resumen-cell-val">{formatCurrency(m.inicial, m.cod)}</div>
                        </div>
                        <div className="cm-resumen-cell">
                          <div className="cm-resumen-cell-label">Ventas en efectivo</div>
                          <div className="cm-resumen-cell-val ventas">
                            +{formatCurrency(m.ventasEfectivo, m.cod)}
                          </div>
                        </div>
                        {m.ingresos > 0 && (
                          <div className="cm-resumen-cell">
                            <div className="cm-resumen-cell-label">Ingresos de caja</div>
                            <div className="cm-resumen-cell-val ventas">+{formatCurrency(m.ingresos, m.cod)}</div>
                          </div>
                        )}
                        {m.egresos > 0 && (
                          <div className="cm-resumen-cell">
                            <div className="cm-resumen-cell-label">Egresos de caja</div>
                            <div className="cm-resumen-cell-val egresos">−{formatCurrency(m.egresos, m.cod)}</div>
                          </div>
                        )}
                        <div className="cm-resumen-cell">
                          <div className="cm-resumen-cell-label">Esperado en Caja</div>
                          <div className="cm-resumen-cell-val esperado">
                            {formatCurrency(m.esperado, m.cod)}
                          </div>
                        </div>
                        {m.otrosMedios > 0 && (
                          <div className="cm-resumen-cell">
                            <div className="cm-resumen-cell-label">Otros medios (no entra a la gaveta)</div>
                            <div className="cm-resumen-cell-val">{formatCurrency(m.otrosMedios, m.cod)}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── ✅ NUEVO: Desglose por método de pago (Nequi, Pago Móvil, Bancolombia, etc.) ── */}
            {desglosePagosData.length > 0 && (
              <>
                <div className="cm-section-title">Desglose por método de pago</div>
                <div className="cm-metodos-grid">
                  {desglosePagosData.map((d) => (
                    <div
                      key={`${d.id_metodo_pago || d.codigo}-${d.codigo_moneda}`}
                      className="cm-resumen-row"
                    >
                      <div className="cm-resumen-tag tag-METODO">
                        <i className={`bi ${d.icono || 'bi-cash'}`} style={{ fontSize: '0.85rem' }}/>
                        {d.nombre}
                      </div>
                      <div className="cm-resumen-cells">
                        <div className="cm-resumen-cell">
                          <div className="cm-resumen-cell-label">Total cobrado</div>
                          <div className="cm-resumen-cell-val ventas">
                            {formatCurrency(d.total, d.codigo_moneda)}
                          </div>
                        </div>
                        <div className="cm-resumen-cell">
                          <div className="cm-resumen-cell-label">Ventas</div>
                          <div className="cm-resumen-cell-val">{d.cantidad_ventas}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* ── FIX: Listado de ventas del turno (colapsable) ── */}
            {ventasTurno.length > 0 && (
              <>
                <div className="cm-section-title">
                  Detalle de ventas del turno
                  <button
                    className="cm-ventas-toggle"
                    onClick={() => setMostrarVentas(v => !v)}
                  >
                    <i className={`bi ${mostrarVentas ? 'bi-chevron-up' : 'bi-chevron-down'}`}/>
                    {mostrarVentas ? 'Ocultar' : `Ver ${ventasTurno.length} ventas`}
                  </button>
                </div>
                {mostrarVentas && (
                  <div className="cm-ventas-table-wrap">
                    <Table hover className="table">
                      <thead>
                        <tr>
                          <th>Factura</th>
                          <th>Hora</th>
                          <th>Cliente</th>
                          <th>Moneda</th>
                          <th className="text-end">Total</th>
                          <th>Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ventasTurno.map(venta => (
                          <tr key={venta.id_venta}>
                            <td className="fw-bold text-primary">{venta.numero_factura}</td>
                            <td className="text-muted">{formatDateTime(venta.fecha_venta)}</td>
                            <td>{venta.nombre_cliente || <span className="text-muted">—</span>}</td>
                            <td><Badge bg="secondary">{venta.codigo_moneda}</Badge></td>
                            <td className="text-end fw-bold">{formatCurrency(venta.total, venta.codigo_moneda)}</td>
                            <td>
                              <Badge bg={colorEstado[venta.estado_venta] || 'secondary'}>
                                {venta.estado_venta}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      {/* Subtotales por moneda al pie de la tabla */}
                      <tfoot className="table-light">
                        <tr>
                          <td colSpan="4" className="text-end fw-bold text-muted small">Totales de esta caja:</td>
                          <td className="text-end" colSpan="2">
                            {monedasMostrar.map(m => m.ventas > 0 ? (
                              <div key={m.cod} className="fw-bold text-success small">
                                +{formatCurrency(m.ventas, m.cod)}{' '}
                                <Badge bg="secondary" className="small">{m.cod}</Badge>
                              </div>
                            ) : null)}
                          </td>
                        </tr>
                      </tfoot>
                    </Table>
                  </div>
                )}
              </>
            )}

            {/* ── Conteo físico (grid responsivo) ── */}
            <div className="cm-section-title">Conteo físico de caja</div>
            <div className="cm-monto-cards">
              {monedasMostrar.map(m => (
                <div
                  key={m.cod}
                  className="cm-monto-card"
                  style={{ background: m.bg, borderColor: m.border }}
                >
                  <div className="cm-monto-card-header">
                    <div className="cm-monto-icon" style={{ background: m.bg, color: m.color }}>
                      <i className={`bi ${m.icon}`}/>
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div className="cm-monto-label">{m.label}</div>
                      <div className="cm-monto-cod">{m.cod} • Efectivo contado en la gaveta</div>
                    </div>
                    <div className="cm-monto-esperado">
                      <div className="cm-monto-esp-label">Esperado</div>
                      <div className="cm-monto-esp-val">{formatCurrency(m.esperado, m.cod)}</div>
                    </div>
                  </div>
                  <div className="cm-input-row">
                    <div className="cm-input-wrap">
                      <span className="cm-input-lbl">Monto real contado ({m.cod}) *</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="cm-input"
                        placeholder="0.00"
                        value={m.val}
                        onChange={e => m.setVal(e.target.value)}
                      />
                    </div>
                  </div>
                  {/* Diferencia en tiempo real */}
                  {m.val !== '' && m.dif !== null && (
                    <div className={`cm-dif ${m.dif >= 0 ? 'ok' : 'neg'}`}>
                      <span className={`cm-dif-label ${m.dif >= 0 ? 'ok' : 'neg'}`}>
                        {m.dif === 0
                          ? <><i className="bi bi-check-circle me-1"/>Cuadra exacto</>
                          : m.dif > 0
                            ? <><i className="bi bi-plus-circle me-1"/>Sobrante:</>
                            : <><i className="bi bi-exclamation-circle me-1"/>Faltante:</>
                        }
                      </span>
                      <span className={`cm-dif-val ${m.dif >= 0 ? 'ok' : 'neg'}`}>
                        {m.dif > 0 ? '+' : ''}{formatCurrency(m.dif, m.cod)}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* ── Observaciones ── */}
            <div className="cm-section-title">Observaciones</div>
            <textarea
              className="cm-obs-textarea"
              placeholder="Notas sobre el cierre, discrepancias, incidentes, etc..."
              value={observaciones}
              onChange={e => setObservaciones(e.target.value)}
            />
          </div>

          {/* ── Footer ── */}
          <div className="cm-footer">
            <button className="cm-btn-cancel" onClick={onHide}>Cancelar</button>
            <button className="cm-btn-cerrar" onClick={handleCerrar} disabled={cerrando || cargando || ventasPendientes > 0}>
              {cerrando
                ? <><Spinner animation="border" size="sm"/>Cerrando...</>
                : <><i className="bi bi-lock-fill"/>Cerrar Caja</>
              }
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default CerrarCajaModal;