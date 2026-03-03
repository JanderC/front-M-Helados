import { useState, useEffect, useCallback } from 'react';
import { Row, Col, Card, Button, Form, Table, Badge, Alert, Spinner, Pagination } from 'react-bootstrap';
import { cajaService } from '../../api/services/cajaService';
import { ventasService } from '../../api/services/ventasService';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { toast } from 'react-toastify';
import AbrirCajaModal from '../../components/caja/AbrirCajaModal';
import CerrarCajaModal from '../../components/caja/CerrarCajaModal';
import TransaccionModal from '../../components/caja/TransaccionModal';
import DetalleVentaModal from '../../components/ventas/DetalleVentaModal';

const VENTAS_POR_PAGINA = 15;

// ─── Helper: convierte cualquier valor a número seguro ───────────────────────
const num = (v) => parseFloat(v) || 0;

// ─── Helper: construye el rango de fechas consistente ────────────────────────
// Siempre agrega T23:59:59 al fecha_fin para capturar el día completo

const getFechaLocal = () => {
  const hoy = new Date();
  const año = hoy.getFullYear();
  const mes = String(hoy.getMonth() + 1).padStart(2, '0');
  const dia = String(hoy.getDate()).padStart(2, '0');
  return `${año}-${mes}-${dia}`;
};

const buildFiltroParams = (filtros) => {
  const params = {};
  if (filtros.fechaInicio) params.fecha_inicio = filtros.fechaInicio;
  if (filtros.fechaFin)    params.fecha_fin    = filtros.fechaFin + 'T23:59:59';
  return params;
};

const FlujoCajaScreen = () => {
  const [estadoCaja, setEstadoCaja]         = useState(null);
  const [flujo, setFlujo]                   = useState([]);
  const [resumenVentas, setResumenVentas]   = useState(null);
  const [ventasDelDia, setVentasDelDia]     = useState([]);
  const [totalVentasCount, setTotalVentasCount] = useState(0);
  const [paginaActual, setPaginaActual]     = useState(1);
  const [loadingVentas, setLoadingVentas]   = useState(false);
  const [loading, setLoading]               = useState(true);
  const [showAbrirModal, setShowAbrirModal] = useState(false);
  const [showCerrarModal, setShowCerrarModal] = useState(false);
  const [showTransaccionModal, setShowTransaccionModal] = useState(false);
  const [showDetalleModal, setShowDetalleModal] = useState(false);
  const [ventaDetalleId, setVentaDetalleId] = useState(null);
  const [filtros, setFiltros] = useState({
  fechaInicio: getFechaLocal(),
  fechaFin:    getFechaLocal(),
});

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setPaginaActual(1);

      // FIX: usar el mismo helper de fechas en todas las llamadas al backend
      const filtroParams = buildFiltroParams(filtros);

      const [estadoRes, flujoRes, resumenRes] = await Promise.allSettled([
        cajaService.getEstado(),
        cajaService.getFlujo(filtroParams),
        cajaService.getResumenVentas(filtroParams),
      ]);

      if (estadoRes.status === 'fulfilled') {
        const estadoData = estadoRes.value.data?.data || estadoRes.value.data;
        setEstadoCaja(estadoData);
      }

      if (flujoRes.status === 'fulfilled') {
        const flujoData = flujoRes.value.data?.data || [];
        setFlujo(Array.isArray(flujoData) ? flujoData : []);
      } else {
        setFlujo([]);
      }

      if (resumenRes.status === 'fulfilled') {
        const resumenData = resumenRes.value.data?.data || resumenRes.value.data;
        setResumenVentas(resumenData);
      }

      await loadVentasPagina(1);

    } catch (error) {
      console.error('Error al cargar datos:', error);
      toast.error('Error al cargar datos de caja');
    } finally {
      setLoading(false);
    }
  };


  const loadVentasPagina = async (pagina) => {
    try {
      setLoadingVentas(true);

      // FIX: usar el mismo helper de fechas — igual que en loadData
      const params = {
        ...buildFiltroParams(filtros),
        limit:  VENTAS_POR_PAGINA,
        offset: (pagina - 1) * VENTAS_POR_PAGINA,
      };

      const response = await ventasService.getAll(params);
      const rawData  = response.data?.data || response.data || {};

      if (Array.isArray(rawData)) {
        setVentasDelDia(rawData);
        // Si la API no devuelve total, estimar a partir de la página
        setTotalVentasCount(
          rawData.length < VENTAS_POR_PAGINA
            ? (pagina - 1) * VENTAS_POR_PAGINA + rawData.length
            : pagina * VENTAS_POR_PAGINA + 1   // indica que hay más
        );
      } else {
        const items = rawData.items || rawData.ventas || rawData.results || [];
        const total = rawData.total  || rawData.count  || items.length;
        setVentasDelDia(Array.isArray(items) ? items : []);
        setTotalVentasCount(total);
      }
    } catch (error) {
      console.error('Error cargando ventas:', error);
    } finally {
      setLoadingVentas(false);
    }
  };

  const handleCambiarPagina = (pagina) => {
    setPaginaActual(pagina);
    loadVentasPagina(pagina);
  };

  const handleVerDetalle = (id_venta) => {
    setVentaDetalleId(id_venta);
    setShowDetalleModal(true);
  };

  const handleFiltrar = () => {
    loadData();
  };

  // Balance del flujo de movimientos (ingresos - egresos)
  const calcularTotales = () => {
    const totales = {};
    if (Array.isArray(flujo)) {
      flujo.forEach(item => {
        const tipo   = item.tipo_transaccion;
        const moneda = item.codigo_moneda;
        const monto  = num(item.monto);
        if (!totales[moneda]) totales[moneda] = 0;
        if (tipo === 'INGRESO') totales[moneda] += monto;
        else if (tipo === 'EGRESO') totales[moneda] -= monto;
      });
    }
    return totales;
  };


  // FIX: usar num() para evitar NaN con valores null/undefined del backend
  // Muestra todas las monedas con dato válido (>= 0 se muestra si hay ventas)
  const calcularTotalesVentas = () => {
    if (!resumenVentas) return {};
    const totales = {};
    const usd = num(resumenVentas.total_usd_original);
    const ves = num(resumenVentas.total_ves);
    const cop = num(resumenVentas.total_cop);
    if (usd > 0) totales['USD'] = usd;
    if (ves > 0) totales['VES'] = ves;
    if (cop > 0) totales['COP'] = cop;
    return totales;
  };

  const totales       = calcularTotales();
  const totalesVentas = calcularTotalesVentas();
  const cajaAbierta   = estadoCaja?.estado === 'ABIERTA' || estadoCaja?.abierta === true;
  const totalPaginas  = Math.ceil(totalVentasCount / VENTAS_POR_PAGINA);

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold">
          <i className="bi bi-cash-stack me-2 text-primary"></i>
          Flujo de Caja
        </h2>
        <div className="d-flex gap-2">
          {cajaAbierta ? (
            <>
              <Button variant="outline-primary" onClick={() => setShowTransaccionModal(true)}>
                <i className="bi bi-plus-circle me-2"></i>
                Nueva Transacción
              </Button>
              <Button variant="danger" onClick={() => setShowCerrarModal(true)}>
                <i className="bi bi-lock me-2"></i>
                Cerrar Caja
              </Button>
            </>
          ) : (
            <Button variant="success" onClick={() => setShowAbrirModal(true)}>
              <i className="bi bi-unlock me-2"></i>
              Abrir Caja
            </Button>
          )}
        </div>
      </div>

      {/* Estado de Caja */}
      <Row className="mb-4">
        <Col md={12}>
          <Card className={`border-0 shadow-sm border-start border-4 ${cajaAbierta ? 'border-success' : 'border-danger'}`}>
            <Card.Body>
              <Row className="align-items-center">
                <Col md={3}>
                  <h5 className="mb-1">Estado de Caja</h5>
                  <Badge bg={cajaAbierta ? 'success' : 'danger'} className="fs-6">
                    {cajaAbierta ? 'ABIERTA' : 'CERRADA'}
                  </Badge>
                </Col>
                {cajaAbierta && estadoCaja && (
                  <>
                    <Col md={3}>
                      <small className="text-muted d-block">Apertura</small>
                      <strong>{formatDateTime(estadoCaja.fecha_apertura)}</strong>
                    </Col>
                    <Col md={3}>
                      <small className="text-muted d-block">Monto Inicial</small>
                      <strong className="text-primary">
                        {num(estadoCaja.monto_inicial_cop) > 0 && (
                          <div>{formatCurrency(estadoCaja.monto_inicial_cop, 'COP')}</div>
                        )}
                        {num(estadoCaja.monto_inicial_usd) > 0 && (
                          <div>{formatCurrency(estadoCaja.monto_inicial_usd, 'USD')}</div>
                        )}
                        {num(estadoCaja.monto_inicial_ves) > 0 && (
                          <div>{formatCurrency(estadoCaja.monto_inicial_ves, 'VES')}</div>
                        )}
                      </strong>
                    </Col>
                    <Col md={3}>
                      {/* FIX: mostrar ventas_dia desde estadoCaja (desde apertura),
                          que es distinto de resumenVentas (filtro de fecha).
                          Aclarar la diferencia con etiquetas claras. */}
                      {estadoCaja.ventas_dia && (
                        <div>
                          <small className="text-muted d-block">Ventas desde apertura</small>
                          <strong className="text-success">
                            {parseInt(estadoCaja.ventas_dia.total_ventas) || 0} ventas
                          </strong>
                          {num(estadoCaja.ventas_dia.total_cop) > 0 && (
                            <div className="small">{formatCurrency(estadoCaja.ventas_dia.total_cop, 'COP')}</div>
                          )}
                          {num(estadoCaja.ventas_dia.total_usd_original) > 0 && (
                            <div className="small">{formatCurrency(estadoCaja.ventas_dia.total_usd_original, 'USD')}</div>
                          )}
                          {num(estadoCaja.ventas_dia.total_ves) > 0 && (
                            <div className="small">{formatCurrency(estadoCaja.ventas_dia.total_ves, 'VES')}</div>
                          )}
                        </div>
                      )}
                    </Col>
                  </>
                )}
                {!cajaAbierta && (
                  <Col md={9}>
                    <Alert variant="info" className="mb-0">
                      <i className="bi bi-info-circle me-2"></i>
                      No hay caja abierta. Abre una caja para comenzar a registrar transacciones.
                    </Alert>
                  </Col>
                )}
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Resumen de Ventas */}
      <Row className="mb-4">
        <Col md={4}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <p className="text-muted mb-1">Ventas en USD</p>
                  <h3 className="fw-bold mb-0 text-success">
                    {formatCurrency(num(resumenVentas?.total_usd_original), 'USD')}
                  </h3>
                </div>
                <div className="bg-success bg-opacity-10 p-3 rounded">
                  <i className="bi bi-currency-dollar text-success" style={{ fontSize: '1.5rem' }}></i>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <p className="text-muted mb-1">Ventas en Bolívares</p>
                  <h3 className="fw-bold mb-0 text-info">
                    {formatCurrency(num(resumenVentas?.total_ves), 'VES')}
                  </h3>
                </div>
                <div className="bg-info bg-opacity-10 p-3 rounded">
                  <i className="bi bi-cash-coin text-info" style={{ fontSize: '1.5rem' }}></i>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <p className="text-muted mb-1">Ventas en Pesos</p>
                  <h3 className="fw-bold mb-0 text-warning">
                    {formatCurrency(num(resumenVentas?.total_cop), 'COP')}
                  </h3>
                </div>
                <div className="bg-warning bg-opacity-10 p-3 rounded">
                  <i className="bi bi-cash text-warning" style={{ fontSize: '1.5rem' }}></i>
                </div>
              </div>
              {resumenVentas?.total_ventas > 0 && (
                <p className="text-muted small mt-2 mb-0">
                  {resumenVentas.total_ventas} ventas completadas
                </p>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Filtros */}
      <Card className="border-0 shadow-sm mb-4">
        <Card.Body>
          <Row>
            <Col md={4}>
              <Form.Group>
                <Form.Label>Fecha Inicio</Form.Label>
                <Form.Control
                  type="date"
                  value={filtros.fechaInicio}
                  onChange={(e) => setFiltros({ ...filtros, fechaInicio: e.target.value })}
                />
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group>
                <Form.Label>Fecha Fin</Form.Label>
                <Form.Control
                  type="date"
                  value={filtros.fechaFin}
                  onChange={(e) => setFiltros({ ...filtros, fechaFin: e.target.value })}
                />
              </Form.Group>
            </Col>
            <Col md={4} className="d-flex align-items-end">
              <Button variant="primary" onClick={handleFiltrar} className="w-100" disabled={loading}>
                <i className="bi bi-funnel me-2"></i>
                {loading ? 'Cargando...' : 'Filtrar'}
              </Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Tabla de Ventas del Período con paginación */}
      <Card className="border-0 shadow-sm mb-4">
        <Card.Header className="bg-white d-flex justify-content-between align-items-center">
          <h5 className="mb-0">
            <i className="bi bi-receipt me-2 text-primary"></i>
            Ventas del Período
          </h5>
          <Badge bg="primary" pill>
            {resumenVentas?.total_ventas ?? totalVentasCount} ventas totales
          </Badge>
        </Card.Header>
        <Card.Body className="p-0">
          {loadingVentas ? (
            <div className="text-center py-4">
              <Spinner animation="border" variant="primary" size="sm" />
              <span className="ms-2 text-muted">Cargando ventas...</span>
            </div>
          ) : ventasDelDia.length === 0 ? (
            <div className="text-center py-4 text-muted">
              <i className="bi bi-inbox me-2"></i>
              No hay ventas en el período seleccionado
            </div>
          ) : (
            <>
              {/* Tabla con altura máxima y scroll interno */}
              <div style={{ maxHeight: '420px', overflowY: 'auto' }}>
                <Table hover className="mb-0" style={{ fontSize: '0.875rem' }}>
                  <thead className="table-light" style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                    <tr>
                      <th>Factura</th>
                      <th>Hora</th>
                      <th>Cliente</th>
                      <th>Moneda</th>
                      <th>Total</th>
                      <th>Estado</th>
                      <th className="text-center">Detalle</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ventasDelDia.map((venta) => {
                      const colorEstado = {
                        COMPLETADA: 'success',
                        PENDIENTE:  'warning',
                        EN_PROCESO: 'info',
                        CANCELADA:  'danger',
                      };
                      return (
                        <tr key={venta.id_venta}>
                          <td className="fw-bold text-primary">{venta.numero_factura}</td>
                          <td className="small text-muted">{formatDateTime(venta.fecha_venta)}</td>
                          <td>{venta.nombre_cliente || <span className="text-muted">—</span>}</td>
                          <td>
                            <Badge bg="secondary">{venta.codigo_moneda}</Badge>
                          </td>
                          <td className="fw-bold">
                            {formatCurrency(venta.total, venta.codigo_moneda)}
                          </td>
                          <td>
                            <Badge bg={colorEstado[venta.estado_venta] || 'secondary'}>
                              {venta.estado_venta}
                            </Badge>
                          </td>
                          <td className="text-center">
                            <Button
                              variant="outline-primary"
                              size="sm"
                              onClick={() => handleVerDetalle(venta.id_venta)}
                            >
                              <i className="bi bi-eye me-1"></i>
                              Ver
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </Table>
              </div>

              {/* Footer con totales REALES del backend + paginación */}
              <div className="px-3 py-2 border-top bg-light d-flex justify-content-between align-items-center flex-wrap gap-2">
                {/* Totales reales del resumen backend */}
                <div className="d-flex gap-3 align-items-center flex-wrap">
                  <span className="fw-bold text-muted small">Total completadas:</span>
                  {Object.entries(totalesVentas).length > 0
                    ? Object.entries(totalesVentas).map(([moneda, total]) => (
                        <span key={moneda} className="fw-bold text-success">
                          {formatCurrency(total, moneda)}{' '}
                          <Badge bg="secondary" className="small">{moneda}</Badge>
                        </span>
                      ))
                    : <span className="text-muted small">Sin ventas completadas</span>
                  }
                </div>

                {/* Paginación */}
                {totalPaginas > 1 && (
                  <Pagination size="sm" className="mb-0">
                    <Pagination.First
                      disabled={paginaActual === 1}
                      onClick={() => handleCambiarPagina(1)}
                    />
                    <Pagination.Prev
                      disabled={paginaActual === 1}
                      onClick={() => handleCambiarPagina(paginaActual - 1)}
                    />
                    {Array.from({ length: Math.min(5, totalPaginas) }, (_, i) => {
                      let start = Math.max(1, paginaActual - 2);
                      const end = Math.min(start + 4, totalPaginas);
                      start = Math.max(1, end - 4);
                      const page = start + i;
                      if (page > totalPaginas) return null;
                      return (
                        <Pagination.Item
                          key={page}
                          active={page === paginaActual}
                          onClick={() => handleCambiarPagina(page)}
                        >
                          {page}
                        </Pagination.Item>
                      );
                    })}
                    <Pagination.Next
                      disabled={paginaActual === totalPaginas}
                      onClick={() => handleCambiarPagina(paginaActual + 1)}
                    />
                    <Pagination.Last
                      disabled={paginaActual === totalPaginas}
                      onClick={() => handleCambiarPagina(totalPaginas)}
                    />
                  </Pagination>
                )}
              </div>
            </>
          )}
        </Card.Body>
      </Card>

      {/* Flujo de Caja (Movimientos) */}
      <Card className="border-0 shadow-sm">
        <Card.Header className="bg-white">
          <h5 className="mb-0">Movimientos de Caja</h5>
        </Card.Header>
        <Card.Body>
          <div className="table-responsive">
            <Table hover>
              <thead className="table-light">
                <tr>
                  <th>Fecha</th>
                  <th>Tipo</th>
                  <th>Concepto</th>
                  <th>Moneda</th>
                  <th className="text-end">Monto</th>
                </tr>
              </thead>
              <tbody>
                {!Array.isArray(flujo) || flujo.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center py-4 text-muted">
                      No hay movimientos en el período seleccionado
                    </td>
                  </tr>
                ) : (
                  flujo.map((item, index) => {
                    const tipo   = item.tipo_transaccion;
                    const moneda = item.codigo_moneda;
                    const fecha  = item.fecha_transaccion;
                    return (
                      <tr key={item.id_transaccion || index}>
                        <td>{formatDateTime(fecha)}</td>
                        <td>
                          <Badge bg={tipo === 'INGRESO' ? 'success' : 'danger'}>
                            {tipo}
                          </Badge>
                        </td>
                        <td>{item.concepto}</td>
                        <td>
                          <Badge bg="secondary">{moneda}</Badge>
                        </td>
                        <td className={`text-end fw-bold ${tipo === 'INGRESO' ? 'text-success' : 'text-danger'}`}>
                          {tipo === 'INGRESO' ? '+' : '-'}{formatCurrency(item.monto, moneda)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              {Array.isArray(flujo) && flujo.length > 0 && (
                <tfoot className="table-light">
                  <tr>
                    <td colSpan="4" className="text-end"><strong>Balance del período:</strong></td>
                    <td className="text-end">
                      {Object.entries(totales).map(([moneda, balance]) => (
                        <div key={moneda} className={`fw-bold ${balance >= 0 ? 'text-success' : 'text-danger'}`}>
                          {balance >= 0 ? '+' : ''}{formatCurrency(balance, moneda)}
                          <Badge bg="secondary" className="ms-1 small">{moneda}</Badge>
                        </div>
                      ))}
                    </td>
                  </tr>
                </tfoot>
              )}
            </Table>
          </div>
        </Card.Body>
      </Card>

      {/* Modales */}
      <AbrirCajaModal
        show={showAbrirModal}
        onHide={() => setShowAbrirModal(false)}
        onSuccess={loadData}
      />
      {/* FIX: pasar ventasDelDia al modal de cierre para que muestre la lista de ventas */}
      <CerrarCajaModal
        show={showCerrarModal}
        onHide={() => setShowCerrarModal(false)}
        estadoCaja={estadoCaja}
        resumenVentas={resumenVentas}
        ventasDelDia={ventasDelDia}
        onSuccess={loadData}
      />
      <TransaccionModal
        show={showTransaccionModal}
        onHide={() => setShowTransaccionModal(false)}
        onSuccess={loadData}
      />
      <DetalleVentaModal
        show={showDetalleModal}
        onHide={() => {
          setShowDetalleModal(false);
          setVentaDetalleId(null);
        }}
        ventaId={ventaDetalleId}
        onStatusChange={() => {
          loadData();
          setShowDetalleModal(false);
          setVentaDetalleId(null);
        }}
      />
    </div>
  );
};

export default FlujoCajaScreen;