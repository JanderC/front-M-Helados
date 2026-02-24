import { useState, useEffect } from 'react';
import { Modal, Spinner } from 'react-bootstrap';
import { cajaService } from '../../api/services/cajaService';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { toast } from 'react-toastify';

/* ─── helpers ─────────────────────────────────────── */
const num = (v) => parseFloat(v) || 0;

/**
 * CerrarCajaModal
 * Props:
 *  - show: boolean
 *  - onHide: fn
 *  - estadoCaja: objeto retornado por GET /api/caja/estado
 *      estadoCaja.ventas_dia = { total_cop, total_usd_original, total_ves, total_usd, total_ventas }
 *      estadoCaja.monto_inicial_cop / usd / ves
 *      estadoCaja.fecha_apertura
 *      estadoCaja.usuario_apertura
 *  - onSuccess: fn callback tras cerrar con éxito
 */
const CerrarCajaModal = ({ show, onHide, estadoCaja, onSuccess }) => {
  const [cerrando, setCerrando] = useState(false);
  const [observaciones, setObservaciones] = useState('');

  // Montos finales reales que ingresa el cajero
  const [finalCOP, setFinalCOP] = useState('');
  const [finalUSD, setFinalUSD] = useState('');
  const [finalVES, setFinalVES] = useState('');

  // Reset cuando se abre el modal
  useEffect(() => {
    if (show) {
      setFinalCOP('');
      setFinalUSD('');
      setFinalVES('');
      setObservaciones('');
    }
  }, [show]);

  /* ── Ventas del día desde el backend ── */
  const ventas = estadoCaja?.ventas_dia || {};
  const ventasCOP = num(ventas.total_cop);
  const ventasUSD = num(ventas.total_usd_original);
  const ventasVES = num(ventas.total_ves);
  const totalVentas = parseInt(ventas.total_ventas) || 0;
  // total_usd = todas las ventas convertidas a USD (referencia)
  const totalUSDRef = num(ventas.total_usd);

  /* ── Montos iniciales de la caja ── */
  const inicialCOP = num(estadoCaja?.monto_inicial_cop);
  const inicialUSD = num(estadoCaja?.monto_inicial_usd);
  const inicialVES = num(estadoCaja?.monto_inicial_ves);

  /* ── Esperado = inicial + ventas por moneda ── */
  const esperadoCOP = inicialCOP + ventasCOP;
  const esperadoUSD = inicialUSD + ventasUSD;
  const esperadoVES = inicialVES + ventasVES;

  /* ── Diferencias ── */
  const difCOP = finalCOP !== '' ? num(finalCOP) - esperadoCOP : null;
  const difUSD = finalUSD !== '' ? num(finalUSD) - esperadoUSD : null;
  const difVES = finalVES !== '' ? num(finalVES) - esperadoVES : null;

  /* ── Hay al menos una moneda con actividad ── */
  const hayActividad = ventasCOP > 0 || ventasUSD > 0 || ventasVES > 0 || inicialCOP > 0 || inicialUSD > 0 || inicialVES > 0;

  /* ── Monedas activas (tienen inicial o ventas) ── */
  const monedasActivas = [
    { cod: 'COP', label: 'Pesos Colombianos',  icon: 'bi-cash',          color: '#92400e', bg: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.2)',  inicial: inicialCOP, ventas: ventasCOP, esperado: esperadoCOP, val: finalCOP, setVal: setFinalCOP, dif: difCOP },
    { cod: 'USD', label: 'Dólares',             icon: 'bi-currency-dollar',color: '#15803d',bg: 'rgba(34,197,94,0.07)', border: 'rgba(34,197,94,0.2)',   inicial: inicialUSD, ventas: ventasUSD, esperado: esperadoUSD, val: finalUSD, setVal: setFinalUSD, dif: difUSD },
    { cod: 'VES', label: 'Bolívares',           icon: 'bi-cash-coin',     color: '#1d4ed8', bg: 'rgba(59,130,246,0.07)', border: 'rgba(59,130,246,0.2)', inicial: inicialVES, ventas: ventasVES, esperado: esperadoVES, val: finalVES, setVal: setFinalVES, dif: difVES },
  ].filter(m => m.inicial > 0 || m.ventas > 0);

  // Si no hay ninguna moneda activa, mostrar COP por defecto
  const monedasMostrar = monedasActivas.length > 0 ? monedasActivas : [
    { cod: 'COP', label: 'Pesos Colombianos', icon: 'bi-cash', color: '#92400e', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)', inicial: 0, ventas: 0, esperado: 0, val: finalCOP, setVal: setFinalCOP, dif: difCOP }
  ];

  /* ── Cerrar caja ── */
  const handleCerrar = async () => {
    // Validar que al menos un monto fue ingresado para las monedas activas
    const monedaConVentas = monedasMostrar.find(m => m.ventas > 0 || m.inicial > 0);
    if (monedaConVentas) {
      const tieneMonto = monedasMostrar.every(m => {
        if (m.ventas > 0 || m.inicial > 0) return m.val !== '';
        return true;
      });
      if (!tieneMonto) {
        toast.warning('Ingresa el monto final para cada moneda con actividad');
        return;
      }
    }

    try {
      setCerrando(true);

      // Construir body con los tres montos (el servicio solo acepta uno a la vez,
      // así que llamamos directamente a la API con los tres campos)
      const body = {
        monto_final_cop: finalCOP !== '' ? num(finalCOP) : 0,
        monto_final_usd: finalUSD !== '' ? num(finalUSD) : 0,
        monto_final_ves: finalVES !== '' ? num(finalVES) : 0,
        notas: observaciones.trim() || null,
      };

      // Llamar al endpoint directamente con todos los campos
      // cajaService.cerrar solo soporta una moneda, así que usamos la importación de api
      const { default: api } = await import('../../api/axiosConfig');
      const response = await api.post('/caja/cerrar', body);

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

  return (
    <>
      <style>{`
        .cerrar-modal .modal-content {
          border-radius: 18px !important;
          border: none !important;
          box-shadow: 0 20px 60px rgba(0,0,0,0.18) !important;
          overflow: hidden;
          font-family: 'DM Sans', sans-serif;
        }
        .cm-header {
          background: linear-gradient(135deg, #7B1212, #dc2626);
          padding: 18px 22px;
          display: flex; align-items: center; justify-content: space-between;
        }
        .cm-header-left { display: flex; align-items: center; gap: 12px; }
        .cm-header-icon {
          width: 42px; height: 42px; border-radius: 11px;
          background: rgba(255,255,255,0.15);
          display: flex; align-items: center; justify-content: center;
          font-size: 1.3rem; color: #fff;
        }
        .cm-header-title { font-family: 'Syne', sans-serif; font-weight: 800; font-size: 1.05rem; color: #fff; margin: 0; }
        .cm-header-sub { font-size: 0.75rem; color: rgba(255,255,255,0.7); margin: 2px 0 0; }
        .cm-close {
          width: 32px; height: 32px; border-radius: 8px;
          background: rgba(255,255,255,0.15); border: none; color: #fff;
          cursor: pointer; display: flex; align-items: center; justify-content: center;
          font-size: 1.1rem; transition: background 0.15s;
        }
        .cm-close:hover { background: rgba(255,255,255,0.25); }

        .cm-body { padding: 20px 22px; max-height: 72vh; overflow-y: auto; }

        /* Alerta */
        .cm-alert {
          display: flex; gap: 10px; align-items: flex-start;
          background: rgba(245,158,11,0.08); border: 1px solid rgba(245,158,11,0.25);
          border-radius: 11px; padding: 12px 14px; margin-bottom: 18px;
          font-size: 0.83rem; color: #92400e;
        }
        .cm-alert i { font-size: 1rem; flex-shrink: 0; margin-top: 1px; }

        /* Info table */
        .cm-info-table { width: 100%; border-collapse: collapse; margin-bottom: 18px; }
        .cm-info-table td {
          padding: 9px 12px; font-size: 0.875rem;
          border-bottom: 1px solid rgba(123,47,190,0.07);
        }
        .cm-info-table td:first-child { font-weight: 700; color: #6b7280; width: 45%; }
        .cm-info-table tr:last-child td { border-bottom: none; }

        /* Separador */
        .cm-section-title {
          font-size: 0.68rem; font-weight: 800; text-transform: uppercase;
          letter-spacing: 0.1em; color: #9580b0; margin: 18px 0 10px;
          display: flex; align-items: center; gap: 8px;
        }
        .cm-section-title::after { content:''; flex:1; height:1px; background:rgba(123,47,190,0.1); }

        /* Totales resumen por moneda */
        .cm-resumen-monedas { display: flex; flex-direction: column; gap: 8px; margin-bottom: 18px; }
        .cm-resumen-row {
          display: flex; gap: 0; border-radius: 11px; overflow: hidden;
          border: 1px solid rgba(123,47,190,0.1);
        }
        .cm-resumen-tag {
          padding: 0 14px; display: flex; align-items: center; justify-content: center;
          font-family: 'Syne', sans-serif; font-weight: 800; font-size: 0.8rem;
          min-width: 56px; flex-shrink: 0;
        }
        .cm-resumen-cells { flex: 1; display: flex; }
        .cm-resumen-cell {
          flex: 1; padding: 8px 12px; border-left: 1px solid rgba(123,47,190,0.08);
        }
        .cm-resumen-cell-label { font-size: 0.62rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #94a3b8; margin-bottom: 2px; }
        .cm-resumen-cell-val { font-family: 'Syne', sans-serif; font-weight: 800; font-size: 0.92rem; color: #1a0a2e; }

        /* Campos de monto final */
        .cm-monto-cards { display: flex; flex-direction: column; gap: 12px; margin-bottom: 18px; }
        .cm-monto-card {
          border-radius: 13px; padding: 14px 16px;
          border: 1.5px solid;
        }
        .cm-monto-card-header {
          display: flex; align-items: center; gap: 10px; margin-bottom: 10px;
        }
        .cm-monto-icon {
          width: 36px; height: 36px; border-radius: 9px;
          display: flex; align-items: center; justify-content: center; font-size: 1rem;
          flex-shrink: 0;
        }
        .cm-monto-label { font-family: 'Syne', sans-serif; font-weight: 700; font-size: 0.9rem; color: #1a0a2e; }
        .cm-monto-cod { font-size: 0.72rem; color: #94a3b8; margin-top: 1px; }
        .cm-monto-esperado { margin-left: auto; text-align: right; }
        .cm-monto-esp-label { font-size: 0.65rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #94a3b8; }
        .cm-monto-esp-val { font-family: 'Syne', sans-serif; font-weight: 800; font-size: 0.95rem; color: #7B2FBE; }

        .cm-input-row { display: flex; gap: 10px; align-items: flex-end; }
        .cm-input-wrap { flex: 1; }
        .cm-input-lbl { font-size: 0.68rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #94a3b8; margin-bottom: 5px; display: block; }
        .cm-input {
          width: 100%; padding: 11px 14px; border-radius: 10px;
          font-family: 'Syne', sans-serif; font-weight: 700; font-size: 1rem;
          border: 1.5px solid rgba(123,47,190,0.2); outline: none;
          transition: border-color 0.15s ease;
        }
        .cm-input:focus { border-color: #7B2FBE; }

        /* Diferencia */
        .cm-dif {
          display: flex; justify-content: space-between; align-items: center;
          padding: 8px 12px; border-radius: 8px; margin-top: 8px;
          font-size: 0.82rem;
        }
        .cm-dif.ok { background: rgba(34,197,94,0.08); }
        .cm-dif.neg { background: rgba(239,68,68,0.08); }
        .cm-dif-label { font-weight: 700; }
        .cm-dif-label.ok  { color: #15803d; }
        .cm-dif-label.neg { color: #dc2626; }
        .cm-dif-val { font-family: 'Syne', sans-serif; font-weight: 800; }
        .cm-dif-val.ok  { color: #15803d; }
        .cm-dif-val.neg { color: #dc2626; }

        /* Observaciones */
        .cm-obs-textarea {
          width: 100%; padding: 11px 14px; border-radius: 10px;
          font-family: 'DM Sans', sans-serif; font-size: 0.875rem;
          border: 1.5px solid rgba(123,47,190,0.15); outline: none; resize: vertical;
          min-height: 80px; transition: border-color 0.15s;
        }
        .cm-obs-textarea:focus { border-color: #7B2FBE; }

        /* Footer */
        .cm-footer {
          padding: 14px 22px; border-top: 1px solid rgba(123,47,190,0.08);
          background: #faf8fe; display: flex; gap: 10px;
        }
        .cm-btn-cancel {
          flex: 1; padding: 13px; border-radius: 11px;
          border: 1.5px solid rgba(123,47,190,0.2); background: #fff;
          color: #7B2FBE; font-family: 'DM Sans', sans-serif; font-weight: 700;
          cursor: pointer; transition: background 0.15s;
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

        /* Moneda tag colors */
        .tag-COP { background: rgba(245,158,11,0.12); color: #92400e; }
        .tag-USD { background: rgba(34,197,94,0.12);  color: #15803d; }
        .tag-VES { background: rgba(59,130,246,0.12); color: #1d4ed8; }
      `}</style>

      <Modal show={show} onHide={onHide} centered className="cerrar-modal" backdrop="static">
        <div style={{ fontFamily: 'DM Sans, sans-serif' }}>
          {/* Header */}
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

          {/* Body */}
          <div className="cm-body">

            {/* Alerta */}
            <div className="cm-alert">
              <i className="bi bi-exclamation-triangle-fill"/>
              <span>Al cerrar la caja se realizará el arqueo y no podrás realizar más transacciones hasta abrir una nueva caja.</span>
            </div>

            {/* Info del turno */}
            <table className="cm-info-table">
              <tbody>
                <tr>
                  <td>Fecha de Apertura:</td>
                  <td><strong>{estadoCaja?.fecha_apertura ? formatDateTime(estadoCaja.fecha_apertura) : '—'}</strong></td>
                </tr>
                <tr>
                  <td>Responsable:</td>
                  <td><strong>{estadoCaja?.usuario_apertura || '—'}</strong></td>
                </tr>
                <tr>
                  <td>Total Ventas:</td>
                  <td>
                    <span style={{
                      background: 'rgba(123,47,190,0.1)', color: '#7B2FBE',
                      borderRadius: 6, padding: '3px 10px', fontWeight: 800,
                      fontFamily: 'Syne', fontSize: '0.875rem'
                    }}>
                      {totalVentas} {totalVentas === 1 ? 'venta' : 'ventas'}
                    </span>
                  </td>
                </tr>
                {totalUSDRef > 0 && (
                  <tr>
                    <td>Equivalente en USD:</td>
                    <td><strong style={{ color: '#15803d' }}>{formatCurrency(totalUSDRef, 'USD')}</strong></td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Resumen por moneda (inicial + ventas = esperado) */}
            <div className="cm-section-title">Resumen por moneda</div>
            <div className="cm-resumen-monedas">
              {monedasMostrar.map(m => (
                <div key={m.cod} className="cm-resumen-row">
                  <div className={`cm-resumen-tag tag-${m.cod}`}>{m.cod}</div>
                  <div className="cm-resumen-cells">
                    <div className="cm-resumen-cell">
                      <div className="cm-resumen-cell-label">Monto Inicial</div>
                      <div className="cm-resumen-cell-val">{formatCurrency(m.inicial, m.cod)}</div>
                    </div>
                    <div className="cm-resumen-cell">
                      <div className="cm-resumen-cell-label">Ventas del Día</div>
                      <div className="cm-resumen-cell-val" style={{ color: '#15803d' }}>
                        {formatCurrency(m.ventas, m.cod)}
                      </div>
                    </div>
                    <div className="cm-resumen-cell">
                      <div className="cm-resumen-cell-label">Esperado en Caja</div>
                      <div className="cm-resumen-cell-val" style={{ color: '#7B2FBE', fontWeight: 900 }}>
                        {formatCurrency(m.esperado, m.cod)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Campos de monto final */}
            <div className="cm-section-title">Conteo físico de caja</div>
            <div className="cm-monto-cards">
              {monedasMostrar.map(m => (
                <div
                  key={m.cod}
                  className="cm-monto-card"
                  style={{ background: m.bg, borderColor: m.border }}
                >
                  <div className="cm-monto-card-header">
                    <div className="cm-monto-icon" style={{ background: `${m.bg}`, color: m.color }}>
                      <i className={`bi ${m.icon}`}/>
                    </div>
                    <div>
                      <div className="cm-monto-label">{m.label}</div>
                      <div className="cm-monto-cod">{m.cod} • Ingresa el efectivo real contado</div>
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
                        placeholder={`0.00`}
                        value={m.val}
                        onChange={e => m.setVal(e.target.value)}
                        style={{ borderColor: m.val !== '' ? m.border : 'rgba(123,47,190,0.15)' }}
                      />
                    </div>
                  </div>
                  {/* Diferencia en tiempo real */}
                  {m.val !== '' && m.dif !== null && (
                    <div className={`cm-dif ${m.dif >= 0 ? 'ok' : 'neg'}`}>
                      <span className={`cm-dif-label ${m.dif >= 0 ? 'ok' : 'neg'}`}>
                        {m.dif >= 0
                          ? <><i className="bi bi-check-circle me-1"/>Sobrante:</>
                          : <><i className="bi bi-exclamation-circle me-1"/>Faltante:</>
                        }
                      </span>
                      <span className={`cm-dif-val ${m.dif >= 0 ? 'ok' : 'neg'}`}>
                        {m.dif >= 0 ? '+' : ''}{formatCurrency(m.dif, m.cod)}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Observaciones */}
            <div className="cm-section-title">Observaciones</div>
            <textarea
              className="cm-obs-textarea"
              placeholder="Notas sobre el cierre, discrepancias, incidentes, etc..."
              value={observaciones}
              onChange={e => setObservaciones(e.target.value)}
            />
          </div>

          {/* Footer */}
          <div className="cm-footer">
            <button className="cm-btn-cancel" onClick={onHide}>Cancelar</button>
            <button className="cm-btn-cerrar" onClick={handleCerrar} disabled={cerrando}>
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