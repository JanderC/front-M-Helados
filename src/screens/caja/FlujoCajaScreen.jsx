import { useState, useEffect } from 'react';
import { Row, Col, Card, Button, Form, Table, Badge, Alert } from 'react-bootstrap';
import { cajaService } from '../../api/services/cajaService';
import { monedasService } from '../../api/services/monedasService';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { toast } from 'react-toastify';
import AbrirCajaModal from '../../components/caja/AbrirCajaModal';
import CerrarCajaModal from '../../components/caja/CerrarCajaModal';
import TransaccionModal from '../../components/caja/TransaccionModal';

const FlujoCajaScreen = () => {
  const [estadoCaja, setEstadoCaja] = useState(null);
  const [flujo, setFlujo] = useState([]);
  const [resumenVentas, setResumenVentas] = useState(null);
  const [tasas, setTasas] = useState({ USD: 1, VES: 36, COP: 4000 });
  const [loading, setLoading] = useState(true);
  const [showAbrirModal, setShowAbrirModal] = useState(false);
  const [showCerrarModal, setShowCerrarModal] = useState(false);
  const [showTransaccionModal, setShowTransaccionModal] = useState(false);
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
      const [estadoRes, flujoRes, resumenRes, tasasRes] = await Promise.all([
        cajaService.getEstado(),
        cajaService.getFlujo(filtros),
        cajaService.getResumenVentas(filtros),
        monedasService.getTasas()
      ]);
      
      // Extraer correctamente los datos según la estructura de la API
      setEstadoCaja(estadoRes.data?.data || estadoRes.data);
      setFlujo(flujoRes.data?.data || []);
      setResumenVentas(resumenRes.data?.data || resumenRes.data);
      setTasas(tasasRes.data?.data || tasasRes.data);
    } catch (error) {
      console.error('Error al cargar datos:', error);
      toast.error('Error al cargar datos de caja');
    } finally {
      setLoading(false);
    }
  };

  const handleAbrirCaja = () => {
    setShowAbrirModal(true);
  };

  const handleCerrarCaja = () => {
    setShowCerrarModal(true);
  };

  const handleFiltrar = () => {
    loadData();
  };

  const calcularTotales = () => {
    const totales = { USD: 0, VES: 0, COP: 0 };
    
    if (Array.isArray(flujo)) {
      flujo.forEach(item => {
        const tipo = item.tipo || item.tipo_transaccion;
        const moneda = item.moneda || item.codigo_moneda;
        const monto = parseFloat(item.monto) || 0;
        
        if (tipo === 'INGRESO') {
          totales[moneda] = (totales[moneda] || 0) + monto;
        } else if (tipo === 'EGRESO') {
          totales[moneda] = (totales[moneda] || 0) - monto;
        }
      });
    }

    return totales;
  };

  const totales = calcularTotales();

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold">
          <i className="bi bi-cash-stack me-2 text-primary"></i>
          Flujo de Caja
        </h2>
        <div className="d-flex gap-2">
          {estadoCaja?.abierta ? (
            <>
              <Button variant="outline-primary" onClick={() => setShowTransaccionModal(true)}>
                <i className="bi bi-plus-circle me-2"></i>
                Nueva Transacción
              </Button>
              <Button variant="danger" onClick={handleCerrarCaja}>
                <i className="bi bi-lock me-2"></i>
                Cerrar Caja
              </Button>
            </>
          ) : (
            <Button variant="success" onClick={handleAbrirCaja}>
              <i className="bi bi-unlock me-2"></i>
              Abrir Caja
            </Button>
          )}
        </div>
      </div>

      {/* Estado de Caja */}
      <Row className="mb-4">
        <Col md={12}>
          <Card className={`border-0 shadow-sm ${estadoCaja?.abierta ? 'border-start border-success border-4' : 'border-start border-danger border-4'}`}>
            <Card.Body>
              <Row className="align-items-center">
                <Col md={3}>
                  <h5 className="mb-1">Estado de Caja</h5>
                  <Badge bg={estadoCaja?.abierta ? 'success' : 'danger'} className="fs-6">
                    {estadoCaja?.abierta ? 'ABIERTA' : 'CERRADA'}
                  </Badge>
                </Col>
                {estadoCaja?.abierta && (
                  <>
                    <Col md={3}>
                      <small className="text-muted d-block">Apertura</small>
                      <strong>{formatDateTime(estadoCaja.fechaApertura || estadoCaja.fecha_apertura)}</strong>
                    </Col>
                    <Col md={3}>
                      <small className="text-muted d-block">Monto Inicial</small>
                      <strong className="text-primary">
                        {formatCurrency(estadoCaja.montoInicial || estadoCaja.monto_inicial_usd, estadoCaja.moneda || 'USD')}
                      </strong>
                    </Col>
                    <Col md={3}>
                      <small className="text-muted d-block">Responsable</small>
                      <strong>{estadoCaja.usuario?.nombre || estadoCaja.usuario_apertura || 'N/A'}</strong>
                    </Col>
                  </>
                )}
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Resumen de Ventas */}
      {resumenVentas && (
        <Row className="mb-4">
          <Col md={4}>
            <Card className="border-0 shadow-sm h-100">
              <Card.Body>
                <div className="d-flex justify-content-between align-items-start">
                  <div>
                    <p className="text-muted mb-1">Total Ventas USD</p>
                    <h3 className="fw-bold mb-0 text-success">
                      {formatCurrency(resumenVentas.totalUSD || resumenVentas.total_usd || 0, 'USD')}
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
                    <p className="text-muted mb-1">Total Ventas VES</p>
                    <h3 className="fw-bold mb-0 text-info">
                      {formatCurrency(resumenVentas.totalVES || resumenVentas.total_ves || 0, 'VES')}
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
                    <p className="text-muted mb-1">Total Ventas COP</p>
                    <h3 className="fw-bold mb-0 text-warning">
                      {formatCurrency(resumenVentas.totalCOP || resumenVentas.total_cop || 0, 'COP')}
                    </h3>
                  </div>
                  <div className="bg-warning bg-opacity-10 p-3 rounded">
                    <i className="bi bi-cash text-warning" style={{ fontSize: '1.5rem' }}></i>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

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
              <Button variant="primary" onClick={handleFiltrar} className="w-100">
                <i className="bi bi-funnel me-2"></i>
                Filtrar
              </Button>
            </Col>
          </Row>
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
                    const tipo = item.tipo || item.tipo_transaccion;
                    const moneda = item.moneda || item.codigo_moneda;
                    const fecha = item.fecha || item.fecha_transaccion;
                    
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
                    <td colSpan="4" className="text-end"><strong>Totales:</strong></td>
                    <td className="text-end">
                      <div className="fw-bold text-success">{formatCurrency(totales.USD, 'USD')}</div>
                      <div className="fw-bold text-info">{formatCurrency(totales.VES, 'VES')}</div>
                      <div className="fw-bold text-warning">{formatCurrency(totales.COP, 'COP')}</div>
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
    </div>
  );
};

export default FlujoCajaScreen;