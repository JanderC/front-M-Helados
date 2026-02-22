import { useState, useEffect } from 'react';
import { Row, Col, Card, Button, Form, Table, Badge, Alert, Spinner } from 'react-bootstrap';
import { cajaService } from '../../api/services/cajaService';
import { ventasService } from '../../api/services/ventasService';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { toast } from 'react-toastify';
import AbrirCajaModal from '../../components/caja/AbrirCajaModal';
import CerrarCajaModal from '../../components/caja/CerrarCajaModal';
import TransaccionModal from '../../components/caja/TransaccionModal';
import DetalleVentaModal from '../../components/ventas/DetalleVentaModal';

const FlujoCajaScreen = () => {
  const [estadoCaja, setEstadoCaja] = useState(null);
  const [flujo, setFlujo] = useState([]);
  const [resumenVentas, setResumenVentas] = useState(null);
  const [ventasDelDia, setVentasDelDia] = useState([]);
  const [loadingVentas, setLoadingVentas] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showAbrirModal, setShowAbrirModal] = useState(false);
  const [showCerrarModal, setShowCerrarModal] = useState(false);
  const [showTransaccionModal, setShowTransaccionModal] = useState(false);
  const [showDetalleModal, setShowDetalleModal] = useState(false);
  const [ventaDetalleId, setVentaDetalleId] = useState(null);
  const [filtros, setFiltros] = useState({
    fechaInicio: new Date().toISOString().split('T')[0],
    fechaFin: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [estadoRes, flujoRes, resumenRes] = await Promise.allSettled([
        cajaService.getEstado(),
        cajaService.getFlujo(filtros),
        cajaService.getResumenVentas(filtros),
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

      // ✅ Cargar ventas del período filtrado
      await loadVentasDelDia();

    } catch (error) {
      console.error('Error al cargar datos:', error);
      toast.error('Error al cargar datos de caja');
    } finally {
      setLoading(false);
    }
  };

  const loadVentasDelDia = async () => {
    try {
      setLoadingVentas(true);
      const params = {
        limit: 100,
      };
      if (filtros.fechaInicio) params.fecha_inicio = filtros.fechaInicio;
      if (filtros.fechaFin) params.fecha_fin = filtros.fechaFin + 'T23:59:59';

      const response = await ventasService.getAll(params);
      const data = response.data?.data || response.data || [];
      setVentasDelDia(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error cargando ventas del día:', error);
    } finally {
      setLoadingVentas(false);
    }
  };

  const handleVerDetalle = (id_venta) => {
    setVentaDetalleId(id_venta);
    setShowDetalleModal(true);
  };

  const handleFiltrar = () => {
    loadData();
  };

  const calcularTotales = () => {
    const totales = {};

    if (Array.isArray(flujo)) {
      flujo.forEach(item => {
        const tipo = item.tipo_transaccion;
        const moneda = item.codigo_moneda;
        const monto = parseFloat(item.monto) || 0;

        if (!totales[moneda]) totales[moneda] = 0;

        if (tipo === 'INGRESO') {
          totales[moneda] += monto;
        } else if (tipo === 'EGRESO') {
          totales[moneda] -= monto;
        }
      });
    }

    return totales;
  };

  const totales = calcularTotales();
  const cajaAbierta = estadoCaja?.estado === 'ABIERTA' || estadoCaja?.abierta === true;

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
                        {parseFloat(estadoCaja.monto_inicial_cop || 0) > 0 && (
                          <div>{formatCurrency(estadoCaja.monto_inicial_cop, 'COP')}</div>
                        )}
                        {parseFloat(estadoCaja.monto_inicial_usd || 0) > 0 && (
                          <div>{formatCurrency(estadoCaja.monto_inicial_usd, 'USD')}</div>
                        )}
                        {parseFloat(estadoCaja.monto_inicial_ves || 0) > 0 && (
                          <div>{formatCurrency(estadoCaja.monto_inicial_ves, 'VES')}</div>
                        )}
                      </strong>
                    </Col>
                    <Col md={3}>
                      {/* ✅ FIX: Mostrar ventas del día desde estado caja */}
                      {estadoCaja.ventas_dia && (
                        <div>
                          <small className="text-muted d-block">Ventas desde apertura</small>
                          <strong className="text-success">
                            {parseInt(estadoCaja.ventas_dia.total_ventas)} ventas
                          </strong>
                          {parseFloat(estadoCaja.ventas_dia.total_cop) > 0 && (
                            <div className="small">{formatCurrency(estadoCaja.ventas_dia.total_cop, 'COP')}</div>
                          )}
                          {parseFloat(estadoCaja.ventas_dia.total_usd_original) > 0 && (
                            <div className="small">{formatCurrency(estadoCaja.ventas_dia.total_usd_original, 'USD')}</div>
                          )}
                          {parseFloat(estadoCaja.ventas_dia.total_ves) > 0 && (
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

      {/* ✅ FIX: Resumen de Ventas por período filtrado */}
      <Row className="mb-4">
        <Col md={4}>
          <Card className="border-0 shadow-sm h-100">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <p className="text-muted mb-1">Ventas en USD</p>
                  <h3 className="fw-bold mb-0 text-success">
                    {formatCurrency(resumenVentas?.total_usd_original || 0, 'USD')}
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
                    {formatCurrency(resumenVentas?.total_ves || 0, 'VES')}
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
                    {formatCurrency(resumenVentas?.total_cop || 0, 'COP')}
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

      {/* ✅ NUEVO - Tabla de Ventas del Período */}
      <Card className="border-0 shadow-sm mb-4">
        <Card.Header className="bg-white d-flex justify-content-between align-items-center">
          <h5 className="mb-0">
            <i className="bi bi-receipt me-2 text-primary"></i>
            Ventas del Período
          </h5>
          <Badge bg="primary" pill>
            {ventasDelDia.length} ventas
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
            <div className="table-responsive">
              <Table hover className="mb-0">
                <thead className="table-light">
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
                      PENDIENTE: 'warning',
                      EN_PROCESO: 'info',
                      CANCELADA: 'danger',
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
                {/* Totales por moneda */}
                <tfoot className="table-light">
                  <tr>
                    <td colSpan="4" className="text-end fw-bold">
                      Total completadas:
                    </td>
                    <td colSpan="3">
                      {(() => {
                        const completadas = ventasDelDia.filter(v => v.estado_venta === 'COMPLETADA');
                        const porMoneda = completadas.reduce((acc, v) => {
                          const m = v.codigo_moneda;
                          acc[m] = (acc[m] || 0) + parseFloat(v.total);
                          return acc;
                        }, {});
                        return Object.entries(porMoneda).map(([moneda, total]) => (
                          <div key={moneda} className="fw-bold text-success">
                            {formatCurrency(total, moneda)}
                            <Badge bg="secondary" className="ms-1 small">{moneda}</Badge>
                          </div>
                        ));
                      })()}
                    </td>
                  </tr>
                </tfoot>
              </Table>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Flujo de Caja */}
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
                    const tipo = item.tipo_transaccion;
                    const moneda = item.codigo_moneda;
                    const fecha = item.fecha_transaccion;

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
      <CerrarCajaModal
        show={showCerrarModal}
        onHide={() => setShowCerrarModal(false)}
        estadoCaja={estadoCaja}
        onSuccess={loadData}
      />
      <TransaccionModal
        show={showTransaccionModal}
        onHide={() => setShowTransaccionModal(false)}
        onSuccess={loadData}
      />

      {/* ✅ NUEVO - Modal de detalle de venta */}
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
}

export default FlujoCajaScreen;