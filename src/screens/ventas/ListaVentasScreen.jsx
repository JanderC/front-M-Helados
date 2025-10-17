import { useState, useEffect } from 'react';
import { Card, Table, Badge, Button, Form, Row, Col, Spinner } from 'react-bootstrap';
import { ventasService } from '../../api/services/ventasService';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { ESTADOS_PEDIDO, COLORES_ESTADO } from '../../utils/constants';
import { toast } from 'react-toastify';
import DetalleVentaModal from '../../components/ventas/DetalleVentaModal';

const ListaVentasScreen = () => {
  const [ventas, setVentas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [ventaSeleccionada, setVentaSeleccionada] = useState(null);
  const [filtros, setFiltros] = useState({
    estado_venta: '',
    fecha_inicio: '',
    fecha_fin: ''
  });

  useEffect(() => {
    loadVentas();
  }, []);

  const loadVentas = async () => {
    try {
      setLoading(true);
      
      // Construir params solo con valores no vacíos
      const params = {};
      if (filtros.estado_venta) params.estado_venta = filtros.estado_venta;
      if (filtros.fecha_inicio) params.fecha_inicio = filtros.fecha_inicio;
      if (filtros.fecha_fin) params.fecha_fin = filtros.fecha_fin;
      
      const response = await ventasService.getAll(params);
      
      if (response.data.success) {
        setVentas(response.data.data || []);
      }
    } catch (error) {
      console.error('Error al cargar ventas:', error);
      toast.error('Error al cargar ventas');
    } finally {
      setLoading(false);
    }
  };

  const handleVerDetalle = async (venta) => {
    try {
      const response = await ventasService.getById(venta.id_venta);
      
      if (response.data.success) {
        setVentaSeleccionada(response.data.data);
        setShowModal(true);
      }
    } catch (error) {
      console.error('Error al cargar detalle:', error);
      toast.error('Error al cargar detalle de venta');
    }
  };

  const handleFiltrar = () => {
    loadVentas();
  };

  const handleLimpiarFiltros = () => {
    setFiltros({
      estado_venta: '',
      fecha_inicio: '',
      fecha_fin: ''
    });
    setTimeout(() => loadVentas(), 100);
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold">
          <i className="bi bi-list-ul me-2 text-primary"></i>
          Lista de Ventas
        </h2>
      </div>

      {/* Filtros */}
      <Card className="border-0 shadow-sm mb-4">
        <Card.Body>
          <Row>
            <Col md={3}>
              <Form.Group>
                <Form.Label>Estado</Form.Label>
                <Form.Select
                  value={filtros.estado_venta}
                  onChange={(e) => setFiltros({ ...filtros, estado_venta: e.target.value })}
                >
                  <option value="">Todos</option>
                  <option value="PENDIENTE">PENDIENTE</option>
                  <option value="EN_PROCESO">EN PROCESO</option>
                  <option value="COMPLETADA">COMPLETADA</option>
                  <option value="CANCELADA">CANCELADA</option>
                  <option value="DEVUELTA">DEVUELTA</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <Form.Label>Fecha Inicio</Form.Label>
                <Form.Control
                  type="date"
                  value={filtros.fecha_inicio}
                  onChange={(e) => setFiltros({ ...filtros, fecha_inicio: e.target.value })}
                />
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <Form.Label>Fecha Fin</Form.Label>
                <Form.Control
                  type="date"
                  value={filtros.fecha_fin}
                  onChange={(e) => setFiltros({ ...filtros, fecha_fin: e.target.value })}
                />
              </Form.Group>
            </Col>
            <Col md={3} className="d-flex align-items-end gap-2">
              <Button variant="primary" onClick={handleFiltrar} className="flex-grow-1">
                <i className="bi bi-funnel me-2"></i>
                Filtrar
              </Button>
              <Button variant="outline-secondary" onClick={handleLimpiarFiltros}>
                <i className="bi bi-x-circle"></i>
              </Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Tabla de ventas */}
      <Card className="border-0 shadow-sm">
        <Card.Body>
          {loading ? (
            <div className="text-center py-5">
              <Spinner animation="border" variant="primary" />
            </div>
          ) : ventas.length === 0 ? (
            <div className="text-center py-5">
              <i className="bi bi-inbox" style={{ fontSize: '4rem', color: '#ccc' }}></i>
              <h5 className="mt-3 text-muted">No hay ventas</h5>
            </div>
          ) : (
            <div className="table-responsive">
              <Table hover>
                <thead className="table-light">
                  <tr>
                    <th>Factura</th>
                    <th>Fecha</th>
                    <th>Usuario</th>
                    <th>Cliente</th>
                    <th>Total</th>
                    <th>Moneda</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {ventas.map((venta) => (
                    <tr key={venta.id_venta}>
                      <td className="fw-bold">{venta.numero_factura}</td>
                      <td>{formatDateTime(venta.fecha_venta)}</td>
                      <td>{venta.nombre_usuario || '-'}</td>
                      <td>{venta.nombre_cliente || 'Cliente General'}</td>
                      <td className="fw-bold">{formatCurrency(venta.total, venta.codigo_moneda)}</td>
                      <td>
                        <Badge bg="secondary">{venta.codigo_moneda}</Badge>
                      </td>
                      <td>
                        <Badge bg={COLORES_ESTADO[venta.estado_venta] || 'secondary'}>
                          {venta.estado_venta}
                        </Badge>
                      </td>
                      <td>
                        <Button
                          variant="outline-primary"
                          size="sm"
                          onClick={() => handleVerDetalle(venta)}
                        >
                          <i className="bi bi-eye me-1"></i>
                          Ver
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Modal de detalle */}
      <DetalleVentaModal
        show={showModal}
        onHide={() => {
          setShowModal(false);
          setVentaSeleccionada(null);
        }}
        venta={ventaSeleccionada}
        onEstadoChange={() => {
          loadVentas();
          setShowModal(false);
          setVentaSeleccionada(null);
        }}
      />
    </div>
  );
};

export default ListaVentasScreen;