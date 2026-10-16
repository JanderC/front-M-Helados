import { useState, useEffect } from 'react';
import { Modal, Spinner, Table, Badge } from 'react-bootstrap';
import { cajaService } from '../../api/services/cajaService';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { toast } from 'react-toastify';

/* ─── helpers ─────────────────────────────────────── */
const num = (v) => parseFloat(v) || 0;
const redondear = (v) => Math.round(v * 100) / 100;
// Diferencias de menos de un centavo cuentan como exactas
const esCero = (v) => Math.abs(v) < 0.01;

const MONEDAS_INFO = [
  { cod: 'COP', label: 'Pesos Colombianos', icon: 'bi-cash',            color: '#92400e', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.3)' },
  { cod: 'USD', label: 'Dólares',           icon: 'bi-currency-dollar', color: '#15803d', bg: 'rgba(34,197,94,0.07)',  border: 'rgba(34,197,94,0.3)'  },
  { cod: 'VES', label: 'Bolívares',         icon: 'bi-cash-coin',       color: '#1d4ed8', bg: 'rgba(59,130,246,0.07)', border: 'rgba(59,130,246,0.3)' },
];

/**
 * CerrarCajaModal — cierre en dos pasos:
 *  1. Contar: el cajero cuenta el efectivo de la gaveta y anota lo que dice
 *     el banco / cierre del punto para cada pago electrónico, SIN ver lo que
 *     espera el sistema (así el conteo es real y no se copia el número).
 *  2. Revisar: el sistema muestra esperado vs. contado y las diferencias.
 *     Si algo no cuadra se puede volver a contar o explicar en observaciones.
 *
 * Todo el cuadre sale de GET /api/caja/estado (solo ventas de la caja abierta):
 *   estadoCaja.efectivo     = { COP|USD|VES: { inicial, ventas_efectivo, ingresos, egresos, esperado } }
 *   estadoCaja.electronicos = [{ clave, nombre, icono, codigo_moneda, sistema, cantidad_ventas }]
 */
const CerrarCajaModal = ({ show, onHide, estadoCaja, onSuccess }) => {
  const [paso, setPaso]                   = useState('contar');
  const [cerrando, setCerrando]           = useState(false);
  const [observaciones, setObservaciones] = useState('');
  const [mostrarVentas, setMostrarVentas] = useState(false);

  // Estado de caja recién consultado y ventas del turno
  const [caja, setCaja]               = useState(estadoCaja);
  const [ventasTurno, setVentasTurno] = useState([]);
  const [cargando, setCargando]       = useState(false);

  // Lo que anota el cajero: efectivo por moneda y reportado por método
  const [contado, setContado]       = useState({});
  const [reportado, setReportado]   = useState({});

  // Al abrir el modal: limpiar y volver a pedir el estado, para cuadrar
  // contra las ventas de este momento y no contra datos viejos en pantalla
  useEffect(() => {
    if (!show) return;

    setPaso('contar');
    setContado({});
    setReportado({});
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

  const ventasDia        = caja?.ventas_dia || {};
  const totalVentas      = parseInt(ventasDia.total_ventas) || 0;
  const totalUSDRef      = num(ventasDia.total_usd);
  const ventasPendientes = parseInt(caja?.ventas_pendientes) || 0;

  /* ── Efectivo por moneda:
        esperado = inicial + ventas en efectivo + ingresos − egresos ── */
  const monedas = MONEDAS_INFO.map((info) => {
    const sufijo   = info.cod.toLowerCase();
    const efectivo = caja?.efectivo?.[info.cod] || {};
    const inicial  = num(caja?.[`monto_inicial_${sufijo}`]);
    const ventas   = num(info.cod === 'USD' ? ventasDia.total_usd_original : ventasDia[`total_${sufijo}`]);
    const esperado = num(efectivo.esperado);
    const val      = contado[info.cod] ?? '';
    return {
      ...info,
      inicial,
      ventas,
      ventasEfectivo: num(efectivo.ventas_efectivo),
      ingresos: num(efectivo.ingresos),
      egresos: num(efectivo.egresos),
      esperado,
      val,
      dif: val !== '' ? redondear(num(val) - esperado) : null,
    };
  });

  // En la gaveta solo se cuentan las monedas con efectivo en el turno
  const monedasEfectivo = monedas.filter(m => m.inicial > 0 || m.ventasEfectivo > 0 || m.ingresos > 0 || m.egresos > 0);
  const monedasContar   = monedasEfectivo.length > 0 ? monedasEfectivo : [monedas[0]];

  /* ── Pagos electrónicos: sistema vs. lo que reporta el banco / punto ── */
  const electronicos = (caja?.electronicos || []).map((e) => {
    const val = reportado[e.clave] ?? '';
    return { ...e, sistema: num(e.sistema), val, dif: val !== '' ? redondear(num(val) - num(e.sistema)) : null };
  });

  const faltaAnotar = monedasContar.some(m => m.val === '') || electronicos.some(e => e.val === '');
  const descuadres  = [
    ...monedasContar.filter(m => m.dif !== null && !esCero(m.dif)).map(m => ({ nombre: `Efectivo ${m.cod}`, moneda: m.cod, dif: m.dif })),
    ...electronicos.filter(e => e.dif !== null && !esCero(e.dif)).map(e => ({ nombre: e.nombre, moneda: e.codigo_moneda, dif: e.dif })),
  ];

  const irARevisar = () => {
    if (ventasPendientes > 0) {
      toast.warning('Completa o cancela las ventas pendientes antes de cerrar');
      return;
    }
    if (faltaAnotar) {
      toast.warning('Anota el efectivo contado y lo reportado de cada pago electrónico');
      return;
    }
    setPaso('revisar');
  };

  /* ── Cerrar caja ── */
  const handleCerrar = async () => {
    if (descuadres.length > 0 && !observaciones.trim()) {
      toast.warning('Explica la diferencia en observaciones antes de cerrar');
      return;
    }

    try {
      setCerrando(true);
      const response = await cajaService.cerrar(
        { cop: contado.COP, usd: contado.USD, ves: contado.VES },
        observaciones.trim(),
        reportado
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

  const textoDif = (dif, moneda) =>
    esCero(dif) ? 'Exacto' : `${dif > 0 ? 'Sobra +' : 'Falta −'}${formatCurrency(Math.abs(dif), moneda)}`;

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
        /* ── Pasos ── */
        .cm-pasos { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; }
        .cm-paso {
          display: flex; align-items: center; gap: 8px;
          font-weight: 700; font-size: 0.85rem; color: #94a3b8;
        }
        .cm-paso span {
          width: 26px; height: 26px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          background: #e2e8f0; color: #64748b; font-size: 0.8rem;
        }
        .cm-paso.activo { color: #7B2FBE; }
        .cm-paso.activo span { background: #7B2FBE; color: #fff; }
        .cm-paso.hecho span { background: #15803d; color: #fff; }
        .cm-paso-linea { flex: 1; height: 2px; background: #e2e8f0; }

        .cm-electronico { background: rgba(123,47,190,0.04); border-color: rgba(123,47,190,0.2); }

        /* ── Veredicto del cuadre ── */
        .cm-veredicto {
          display: flex; gap: 12px; align-items: flex-start;
          border-radius: 13px; padding: 14px 16px; margin-bottom: 8px;
        }
        .cm-veredicto i { font-size: 1.5rem; }
        .cm-veredicto.ok  { background: rgba(34,197,94,0.1);  color: #15803d; }
        .cm-veredicto.neg { background: rgba(239,68,68,0.08); color: #b91c1c; }
        .cm-veredicto-titulo { font-family: 'Syne', sans-serif; font-weight: 800; font-size: 1.05rem; }
        .cm-veredicto-linea { font-size: 0.85rem; font-weight: 600; }
      `}</style>

      <Modal show={show} onHide={onHide} centered className="cerrar-modal" backdrop="static" size="xl">
        <div style={{ fontFamily: 'DM Sans, sans-serif' }}>

          {/* ── Header ── */}
          <div className="cm-header">
            <div className="cm-header-left">
              <div className="cm-header-icon"><i className="bi bi-lock-fill"/></div>
              <div>
                <p className="cm-header-title">Cerrar Caja</p>
                <p className="cm-header-sub">Arqueo y cierre del turno · {paso === 'contar' ? 'Paso 1 de 2' : 'Paso 2 de 2'}</p>
              </div>
            </div>
            <button className="cm-close" onClick={onHide}><i className="bi bi-x"/></button>
          </div>

          {/* ── Body ── */}
          <div className="cm-body">

            {ventasPendientes > 0 && (
              <div className="cm-alert pendientes">
                <i className="bi bi-hourglass-split"/>
                <span>
                  Hay {ventasPendientes} {ventasPendientes === 1 ? 'venta pendiente' : 'ventas pendientes'} en esta caja.
                  Complétalas o cancélalas en la lista de ventas para poder cerrar.
                </span>
              </div>
            )}

            {/* Pasos */}
            <div className="cm-pasos">
              <div className={`cm-paso ${paso === 'contar' ? 'activo' : 'hecho'}`}>
                <span>1</span> Contar
              </div>
              <div className="cm-paso-linea"/>
              <div className={`cm-paso ${paso === 'revisar' ? 'activo' : ''}`}>
                <span>2</span> Revisar y cerrar
              </div>
            </div>

            {/* Info del turno */}
            <div className="cm-info-box" style={{ marginBottom: 18 }}>
              <div className="cm-info-row">
                <span className="cm-info-row-label">Apertura</span>
                <span className="cm-info-row-val">
                  {caja?.fecha_apertura ? formatDateTime(caja.fecha_apertura) : '—'} · {caja?.usuario_apertura || '—'}
                </span>
              </div>
              <div className="cm-info-row">
                <span className="cm-info-row-label">Ventas de esta caja</span>
                <span className="cm-ventas-chip">
                  {totalVentas} {totalVentas === 1 ? 'venta' : 'ventas'}
                  {totalUSDRef > 0 && ` · ≈ ${formatCurrency(totalUSDRef, 'USD')}`}
                </span>
              </div>
            </div>

            {paso === 'contar' && (
              <>
                <div className="cm-alert">
                  <i className="bi bi-eye-slash-fill"/>
                  <span>
                    Cuenta el efectivo de la gaveta y revisa el banco y el cierre del punto <b>antes</b> de ver
                    lo que espera el sistema. En el siguiente paso verás si cuadra.
                  </span>
                </div>

                {/* ── 1. Efectivo ── */}
                <div className="cm-section-title">Efectivo en la gaveta (incluye el monto inicial)</div>
                <div className="cm-monto-cards">
                  {monedasContar.map(m => (
                    <div key={m.cod} className="cm-monto-card" style={{ background: m.bg, borderColor: m.border }}>
                      <div className="cm-monto-card-header">
                        <div className="cm-monto-icon" style={{ background: m.bg, color: m.color }}>
                          <i className={`bi ${m.icon}`}/>
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div className="cm-monto-label">{m.label}</div>
                          <div className="cm-monto-cod">{m.cod} • billetes y monedas</div>
                        </div>
                      </div>
                      <span className="cm-input-lbl">Total contado ({m.cod}) *</span>
                      <input
                        type="number" step="0.01" min="0" className="cm-input" placeholder="0"
                        value={m.val}
                        onChange={e => setContado(c => ({ ...c, [m.cod]: e.target.value }))}
                      />
                    </div>
                  ))}
                </div>

                {/* ── 2. Pagos electrónicos ── */}
                {electronicos.length > 0 && (
                  <>
                    <div className="cm-section-title">Pagos electrónicos (según banco / cierre del punto)</div>
                    <div className="cm-monto-cards">
                      {electronicos.map(e => (
                        <div key={e.clave} className="cm-monto-card cm-electronico">
                          <div className="cm-monto-card-header">
                            <div className="cm-monto-icon tag-METODO">
                              <i className={`bi ${e.icono || 'bi-phone'}`}/>
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <div className="cm-monto-label">{e.nombre}</div>
                              <div className="cm-monto-cod">{e.codigo_moneda} • {e.cantidad_ventas} {e.cantidad_ventas === 1 ? 'venta' : 'ventas'}</div>
                            </div>
                          </div>
                          <span className="cm-input-lbl">Total recibido ({e.codigo_moneda}) *</span>
                          <input
                            type="number" step="0.01" min="0" className="cm-input" placeholder="0"
                            value={e.val}
                            onChange={ev => setReportado(r => ({ ...r, [e.clave]: ev.target.value }))}
                          />
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}

            {paso === 'revisar' && (
              <>
                <div className={`cm-veredicto ${descuadres.length === 0 ? 'ok' : 'neg'}`}>
                  <i className={`bi ${descuadres.length === 0 ? 'bi-check-circle-fill' : 'bi-exclamation-triangle-fill'}`}/>
                  <div>
                    <div className="cm-veredicto-titulo">
                      {descuadres.length === 0 ? '¡La caja cuadra!' : 'La caja no cuadra'}
                    </div>
                    {descuadres.map(d => (
                      <div key={d.nombre} className="cm-veredicto-linea">{d.nombre}: {textoDif(d.dif, d.moneda)}</div>
                    ))}
                  </div>
                </div>

                <div className="cm-section-title">Efectivo en la gaveta</div>
                <div className="cm-ventas-table-wrap">
                  <Table className="table mb-0">
                    <thead>
                      <tr>
                        <th>Moneda</th>
                        <th className="text-end">Inicial</th>
                        <th className="text-end">+ Ventas efectivo</th>
                        <th className="text-end">+ Ingresos</th>
                        <th className="text-end">− Egresos</th>
                        <th className="text-end">= Esperado</th>
                        <th className="text-end">Contado</th>
                        <th className="text-end">Diferencia</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monedasContar.map(m => (
                        <tr key={m.cod}>
                          <td><Badge bg="secondary">{m.cod}</Badge></td>
                          <td className="text-end">{formatCurrency(m.inicial, m.cod)}</td>
                          <td className="text-end">{formatCurrency(m.ventasEfectivo, m.cod)}</td>
                          <td className="text-end">{formatCurrency(m.ingresos, m.cod)}</td>
                          <td className="text-end">{formatCurrency(m.egresos, m.cod)}</td>
                          <td className="text-end fw-bold">{formatCurrency(m.esperado, m.cod)}</td>
                          <td className="text-end fw-bold">{formatCurrency(num(m.val), m.cod)}</td>
                          <td className={`text-end fw-bold ${esCero(m.dif) ? 'text-success' : 'text-danger'}`}>{textoDif(m.dif, m.cod)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>

                {electronicos.length > 0 && (
                  <>
                    <div className="cm-section-title">Pagos electrónicos</div>
                    <div className="cm-ventas-table-wrap">
                      <Table className="table mb-0">
                        <thead>
                          <tr>
                            <th>Método</th>
                            <th className="text-end">Ventas</th>
                            <th className="text-end">Según sistema</th>
                            <th className="text-end">Según banco / punto</th>
                            <th className="text-end">Diferencia</th>
                          </tr>
                        </thead>
                        <tbody>
                          {electronicos.map(e => (
                            <tr key={e.clave}>
                              <td>{e.nombre} <Badge bg="secondary">{e.codigo_moneda}</Badge></td>
                              <td className="text-end">{e.cantidad_ventas}</td>
                              <td className="text-end fw-bold">{formatCurrency(e.sistema, e.codigo_moneda)}</td>
                              <td className="text-end fw-bold">{formatCurrency(num(e.val), e.codigo_moneda)}</td>
                              <td className={`text-end fw-bold ${esCero(e.dif) ? 'text-success' : 'text-danger'}`}>{textoDif(e.dif, e.codigo_moneda)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </div>
                  </>
                )}

                {/* Ventas del turno (colapsable), para buscar el error si no cuadra */}
                {ventasTurno.length > 0 && (
                  <>
                    <div className="cm-section-title">
                      Ventas del turno
                      <button className="cm-ventas-toggle" onClick={() => setMostrarVentas(v => !v)}>
                        <i className={`bi ${mostrarVentas ? 'bi-chevron-up' : 'bi-chevron-down'}`}/>
                        {mostrarVentas ? 'Ocultar' : `Ver ${ventasTurno.length} ventas`}
                      </button>
                    </div>
                    {mostrarVentas && (
                      <div className="cm-ventas-table-wrap" style={{ maxHeight: 300, overflowY: 'auto' }}>
                        <Table hover className="table">
                          <thead>
                            <tr>
                              <th>Factura</th>
                              <th>Hora</th>
                              <th>Moneda</th>
                              <th className="text-end">Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {ventasTurno.map(venta => (
                              <tr key={venta.id_venta}>
                                <td className="fw-bold text-primary">{venta.numero_factura}</td>
                                <td className="text-muted">{formatDateTime(venta.fecha_venta)}</td>
                                <td><Badge bg="secondary">{venta.codigo_moneda}</Badge></td>
                                <td className="text-end fw-bold">{formatCurrency(venta.total, venta.codigo_moneda)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </Table>
                      </div>
                    )}
                  </>
                )}

                <div className="cm-section-title">
                  Observaciones {descuadres.length > 0 && <span className="text-danger">(obligatorio: explica la diferencia)</span>}
                </div>
                <textarea
                  className="cm-obs-textarea"
                  placeholder="Ej: faltó registrar una venta, se dio mal un vuelto, pago móvil sin confirmar..."
                  value={observaciones}
                  onChange={e => setObservaciones(e.target.value)}
                />
              </>
            )}
          </div>

          {/* ── Footer ── */}
          <div className="cm-footer">
            {paso === 'contar' ? (
              <>
                <button className="cm-btn-cancel" onClick={onHide}>Cancelar</button>
                <button className="cm-btn-cerrar" onClick={irARevisar} disabled={cargando || ventasPendientes > 0}>
                  {cargando
                    ? <><Spinner animation="border" size="sm"/>Cargando...</>
                    : <><i className="bi bi-calculator"/>Revisar cuadre</>
                  }
                </button>
              </>
            ) : (
              <>
                <button className="cm-btn-cancel" onClick={() => setPaso('contar')} disabled={cerrando}>
                  <i className="bi bi-arrow-left me-1"/>Volver a contar
                </button>
                <button className="cm-btn-cerrar" onClick={handleCerrar} disabled={cerrando}>
                  {cerrando
                    ? <><Spinner animation="border" size="sm"/>Cerrando...</>
                    : <><i className="bi bi-lock-fill"/>Confirmar cierre</>
                  }
                </button>
              </>
            )}
          </div>
        </div>
      </Modal>
    </>
  );
};

export default CerrarCajaModal;