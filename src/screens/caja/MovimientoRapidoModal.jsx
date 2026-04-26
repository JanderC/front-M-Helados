import { useState, useEffect } from 'react';
import { Modal, Button, Form, Spinner, Badge } from 'react-bootstrap';
import { cajaService } from '../../api/services/cajaService';
import { toast } from 'react-toastify';

// ── Categorías por tipo ───────────────────────────────────────────────────────
const CATEGORIAS = {
  INGRESO: [
    { value: 'VENTA_PRODUCTO',   label: 'Venta de Producto',   icon: 'bi-bag-check'       },
    { value: 'VENTA_SERVICIO',   label: 'Venta de Servicio',   icon: 'bi-tools'            },
    { value: 'ANTICIPO',         label: 'Anticipo / Adelanto', icon: 'bi-credit-card'      },
    { value: 'DEVOLUCION_PAGO',  label: 'Devolución de Pago',  icon: 'bi-arrow-return-left'},
    { value: 'OTRO_INGRESO',     label: 'Otro Ingreso',        icon: 'bi-plus-circle'      },
  ],
  EGRESO: [
    { value: 'PROVEEDOR',        label: 'Pago a Proveedor',    icon: 'bi-truck'            },
    { value: 'NOMINA',           label: 'Nómina / Salario',    icon: 'bi-people'           },
    { value: 'SERVICIOS',        label: 'Servicios (luz/agua)', icon: 'bi-lightning'       },
    { value: 'ARRIENDO',         label: 'Arriendo / Alquiler', icon: 'bi-house'            },
    { value: 'INSUMOS',          label: 'Compra de Insumos',   icon: 'bi-cart'             },
    { value: 'OTRO_EGRESO',      label: 'Otro Egreso',         icon: 'bi-dash-circle'      },
  ],
};

const METODOS_PAGO = [
  { value: 'EFECTIVO',     label: 'Efectivo',      icon: 'bi-cash'          },
  { value: 'TRANSFERENCIA',label: 'Transferencia', icon: 'bi-bank'          },
  { value: 'TARJETA',      label: 'Tarjeta',       icon: 'bi-credit-card-2-front'},
  { value: 'PAGO_MOVIL',   label: 'Pago Móvil',    icon: 'bi-phone'         },
];

/**
 * MovimientoRapidoModal
 * Modal dedicado para registrar ingresos y egresos de caja de forma rápida y visual.
 *
 * Props:
 *   show        {boolean}   – controla visibilidad
 *   onHide      {function}  – callback para cerrar
 *   onSuccess   {function}  – callback tras registro exitoso (recarga datos)
 *   tipoInicial {'INGRESO'|'EGRESO'|null} – pre-seleccionar un tipo al abrir
 */
const MovimientoRapidoModal = ({ show, onHide, onSuccess, tipoInicial = null }) => {
  const [tipo,       setTipo]       = useState('INGRESO');
  const [categoria,  setCategoria]  = useState('');
  const [concepto,   setConcepto]   = useState('');
  const [descripcion,setDescripcion]= useState('');
  const [monto,      setMonto]      = useState('');
  const [idMoneda,   setIdMoneda]   = useState('');
  const [metodoPago, setMetodoPago] = useState('EFECTIVO');
  const [monedas,    setMonedas]    = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [loadingMonedas, setLoadingMonedas] = useState(false);
  const [errores,    setErrores]    = useState({});

  // ── Inicializar tipo si viene pre-seleccionado ───────────────────────────
  useEffect(() => {
    if (show) {
      setTipo(tipoInicial || 'INGRESO');
      resetForm();
      cargarMonedas();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show, tipoInicial]);

  // Resetear categoría al cambiar tipo
  useEffect(() => {
    setCategoria('');
  }, [tipo]);

  const resetForm = () => {
    setCategoria('');
    setConcepto('');
    setDescripcion('');
    setMonto('');
    setMetodoPago('EFECTIVO');
    setErrores({});
  };

  const cargarMonedas = async () => {
    try {
      setLoadingMonedas(true);
      // Usa el endpoint de tipos de moneda disponible en tu API
      const res = await fetch('/api/tipos-moneda', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (res.ok) {
        const data = await res.json();
        const lista = data.data || data || [];
        setMonedas(lista);
        if (lista.length > 0 && !idMoneda) {
          // Pre-seleccionar COP si existe, si no la primera
          const cop = lista.find(m => m.codigo_moneda === 'COP');
          setIdMoneda(cop ? String(cop.id_moneda) : String(lista[0].id_moneda));
        }
      }
    } catch (err) {
      console.error('Error cargando monedas:', err);
      // Fallback con monedas hardcodeadas si el endpoint falla
      const fallback = [
        { id_moneda: 1, codigo_moneda: 'COP', simbolo: '$' },
        { id_moneda: 2, codigo_moneda: 'USD', simbolo: 'US$' },
        { id_moneda: 3, codigo_moneda: 'VES', simbolo: 'Bs.' },
      ];
      setMonedas(fallback);
      setIdMoneda('1');
    } finally {
      setLoadingMonedas(false);
    }
  };

  const validar = () => {
    const e = {};
    if (!concepto.trim())  e.concepto = 'El concepto es obligatorio';
    if (!monto || isNaN(parseFloat(monto)) || parseFloat(monto) <= 0)
      e.monto = 'Ingresa un monto válido mayor a 0';
    if (!idMoneda)         e.idMoneda = 'Selecciona una moneda';
    setErrores(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validar()) return;
    try {
      setLoading(true);
      await cajaService.registrarTransaccion({
        tipo_transaccion: tipo,
        concepto:         concepto.trim(),
        descripcion:      descripcion.trim(),
        monto:            parseFloat(monto),
        id_moneda:        parseInt(idMoneda),
        categoria_gasto:  categoria || null,
        metodo_pago:      metodoPago,
      });
      toast.success(
        tipo === 'INGRESO'
          ? '✅ Ingreso registrado correctamente'
          : '✅ Egreso registrado correctamente'
      );
      onSuccess?.();
      onHide();
    } catch (err) {
      console.error('Error al registrar movimiento:', err);
      const msg = err.response?.data?.message || 'Error al registrar el movimiento';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const monedaSeleccionada = monedas.find(m => String(m.id_moneda) === String(idMoneda));
  const categoriasActuales = CATEGORIAS[tipo] || [];

  return (
    <Modal show={show} onHide={onHide} centered size="md">
      {/* ── Encabezado con selector visual INGRESO / EGRESO ── */}
      <Modal.Header className="border-0 pb-0 pt-4 px-4">
        <div className="w-100">
          <h5 className="fw-bold mb-3">
            <i className="bi bi-arrow-left-right me-2 text-primary"></i>
            Registrar Movimiento de Caja
          </h5>

          {/* Selector tipo — botones grandes y visuales */}
          <div className="d-flex gap-2">
            <button
              type="button"
              onClick={() => setTipo('INGRESO')}
              style={{
                flex: 1,
                border: `2px solid ${tipo === 'INGRESO' ? '#198754' : '#dee2e6'}`,
                borderRadius: 10,
                padding: '10px 0',
                background: tipo === 'INGRESO' ? '#d1e7dd' : '#f8f9fa',
                color:  tipo === 'INGRESO' ? '#0f5132' : '#6c757d',
                fontWeight: 700,
                fontSize: '0.95rem',
                cursor: 'pointer',
                transition: 'all 0.18s ease',
              }}
            >
              <i className="bi bi-arrow-down-circle-fill me-2"
                 style={{ color: tipo === 'INGRESO' ? '#198754' : '#adb5bd', fontSize: '1.1rem' }}></i>
              INGRESO
            </button>
            <button
              type="button"
              onClick={() => setTipo('EGRESO')}
              style={{
                flex: 1,
                border: `2px solid ${tipo === 'EGRESO' ? '#dc3545' : '#dee2e6'}`,
                borderRadius: 10,
                padding: '10px 0',
                background: tipo === 'EGRESO' ? '#f8d7da' : '#f8f9fa',
                color:  tipo === 'EGRESO' ? '#842029' : '#6c757d',
                fontWeight: 700,
                fontSize: '0.95rem',
                cursor: 'pointer',
                transition: 'all 0.18s ease',
              }}
            >
              <i className="bi bi-arrow-up-circle-fill me-2"
                 style={{ color: tipo === 'EGRESO' ? '#dc3545' : '#adb5bd', fontSize: '1.1rem' }}></i>
              EGRESO
            </button>
          </div>
        </div>
      </Modal.Header>

      <Modal.Body className="px-4 pt-3 pb-2">

        {/* ── Categorías rápidas ── */}
        <div className="mb-3">
          <Form.Label className="small text-muted fw-semibold text-uppercase mb-2">
            Categoría <span className="text-muted fw-normal">(opcional)</span>
          </Form.Label>
          <div className="d-flex flex-wrap gap-2">
            {categoriasActuales.map((cat) => (
              <button
                key={cat.value}
                type="button"
                onClick={() => {
                  setCategoria(cat.value);
                  if (!concepto) setConcepto(cat.label);
                }}
                style={{
                  border: `1.5px solid ${categoria === cat.value
                    ? (tipo === 'INGRESO' ? '#198754' : '#dc3545')
                    : '#dee2e6'}`,
                  borderRadius: 8,
                  padding: '5px 10px',
                  background: categoria === cat.value
                    ? (tipo === 'INGRESO' ? '#d1e7dd' : '#f8d7da')
                    : '#fff',
                  color: categoria === cat.value
                    ? (tipo === 'INGRESO' ? '#0f5132' : '#842029')
                    : '#495057',
                  fontSize: '0.8rem',
                  fontWeight: categoria === cat.value ? 700 : 400,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap',
                }}
              >
                <i className={`bi ${cat.icon} me-1`}></i>
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Concepto ── */}
        <Form.Group className="mb-3">
          <Form.Label className="small text-muted fw-semibold text-uppercase">
            Concepto <span className="text-danger">*</span>
          </Form.Label>
          <Form.Control
            type="text"
            placeholder={tipo === 'INGRESO' ? 'Ej: Venta helado de vainilla' : 'Ej: Pago proveedor lácteos'}
            value={concepto}
            onChange={(e) => { setConcepto(e.target.value); setErrores(p => ({ ...p, concepto: null })); }}
            isInvalid={!!errores.concepto}
            maxLength={200}
          />
          <Form.Control.Feedback type="invalid">{errores.concepto}</Form.Control.Feedback>
        </Form.Group>

        {/* ── Monto + Moneda en una fila ── */}
        <div className="d-flex gap-2 mb-3">
          <Form.Group style={{ flex: 2 }}>
            <Form.Label className="small text-muted fw-semibold text-uppercase">
              Monto <span className="text-danger">*</span>
            </Form.Label>
            <div className="input-group">
              {monedaSeleccionada && (
                <span className="input-group-text fw-bold"
                  style={{
                    background: tipo === 'INGRESO' ? '#d1e7dd' : '#f8d7da',
                    color: tipo === 'INGRESO' ? '#0f5132' : '#842029',
                    border: `1px solid ${tipo === 'INGRESO' ? '#badbcc' : '#f5c2c7'}`,
                    minWidth: 44,
                    justifyContent: 'center',
                  }}>
                  {monedaSeleccionada.simbolo}
                </span>
              )}
              <Form.Control
                type="number"
                min="0.01"
                step="0.01"
                placeholder="0.00"
                value={monto}
                onChange={(e) => { setMonto(e.target.value); setErrores(p => ({ ...p, monto: null })); }}
                isInvalid={!!errores.monto}
                style={{ fontSize: '1.1rem', fontWeight: 600 }}
              />
              <Form.Control.Feedback type="invalid">{errores.monto}</Form.Control.Feedback>
            </div>
          </Form.Group>

          <Form.Group style={{ flex: 1 }}>
            <Form.Label className="small text-muted fw-semibold text-uppercase">Moneda</Form.Label>
            {loadingMonedas ? (
              <div className="d-flex align-items-center pt-2">
                <Spinner size="sm" animation="border" variant="secondary" />
              </div>
            ) : (
              <Form.Select
                value={idMoneda}
                onChange={(e) => { setIdMoneda(e.target.value); setErrores(p => ({ ...p, idMoneda: null })); }}
                isInvalid={!!errores.idMoneda}
              >
                {monedas.map(m => (
                  <option key={m.id_moneda} value={m.id_moneda}>
                    {m.codigo_moneda}
                  </option>
                ))}
              </Form.Select>
            )}
          </Form.Group>
        </div>

        {/* ── Método de pago ── */}
        <Form.Group className="mb-3">
          <Form.Label className="small text-muted fw-semibold text-uppercase">Método de Pago</Form.Label>
          <div className="d-flex gap-2 flex-wrap">
            {METODOS_PAGO.map(mp => (
              <button
                key={mp.value}
                type="button"
                onClick={() => setMetodoPago(mp.value)}
                style={{
                  border: `1.5px solid ${metodoPago === mp.value ? '#0d6efd' : '#dee2e6'}`,
                  borderRadius: 8,
                  padding: '5px 12px',
                  background: metodoPago === mp.value ? '#cfe2ff' : '#fff',
                  color: metodoPago === mp.value ? '#084298' : '#495057',
                  fontSize: '0.82rem',
                  fontWeight: metodoPago === mp.value ? 700 : 400,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <i className={`bi ${mp.icon} me-1`}></i>
                {mp.label}
              </button>
            ))}
          </div>
        </Form.Group>

        {/* ── Notas (colapsable) ── */}
        <Form.Group className="mb-2">
          <Form.Label className="small text-muted fw-semibold text-uppercase">
            Notas <span className="text-muted fw-normal">(opcional)</span>
          </Form.Label>
          <Form.Control
            as="textarea"
            rows={2}
            placeholder="Observaciones adicionales..."
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            maxLength={500}
            style={{ resize: 'none', fontSize: '0.875rem' }}
          />
        </Form.Group>

        {/* ── Preview del movimiento ── */}
        {monto && parseFloat(monto) > 0 && monedaSeleccionada && (
          <div
            className="rounded-3 p-3 mt-3"
            style={{
              background: tipo === 'INGRESO'
                ? 'linear-gradient(135deg, #d1e7dd 0%, #a3cfbb 100%)'
                : 'linear-gradient(135deg, #f8d7da 0%, #f1aeb5 100%)',
              border: `1px solid ${tipo === 'INGRESO' ? '#badbcc' : '#f5c2c7'}`,
            }}
          >
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <div className="small fw-semibold"
                  style={{ color: tipo === 'INGRESO' ? '#0a3622' : '#58151c' }}>
                  {tipo === 'INGRESO' ? '↓ Se sumará al balance' : '↑ Se restará del balance'}
                </div>
                <div className="small text-muted" style={{ color: tipo === 'INGRESO' ? '#146c43' : '#842029' }}>
                  {concepto || 'Sin concepto'} · {metodoPago.replace('_', ' ')}
                </div>
              </div>
              <div className="fw-bold fs-5"
                style={{ color: tipo === 'INGRESO' ? '#0f5132' : '#842029' }}>
                {tipo === 'INGRESO' ? '+' : '−'}
                {monedaSeleccionada.simbolo}
                {parseFloat(monto).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                {' '}
                <Badge bg={tipo === 'INGRESO' ? 'success' : 'danger'} style={{ fontSize: '0.7rem' }}>
                  {monedaSeleccionada.codigo_moneda}
                </Badge>
              </div>
            </div>
          </div>
        )}
      </Modal.Body>

      <Modal.Footer className="border-0 px-4 pb-4 pt-2 d-flex gap-2">
        <Button variant="light" onClick={onHide} disabled={loading} className="flex-fill">
          Cancelar
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={loading}
          className="flex-fill fw-bold"
          style={{
            background: tipo === 'INGRESO'
              ? 'linear-gradient(135deg, #198754 0%, #20c997 100%)'
              : 'linear-gradient(135deg, #dc3545 0%, #fd7e14 100%)',
            border: 'none',
          }}
        >
          {loading
            ? <><Spinner size="sm" animation="border" className="me-2" />Guardando...</>
            : <><i className={`bi ${tipo === 'INGRESO' ? 'bi-arrow-down-circle' : 'bi-arrow-up-circle'} me-2`}></i>
                Registrar {tipo === 'INGRESO' ? 'Ingreso' : 'Egreso'}
              </>
          }
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default MovimientoRapidoModal;