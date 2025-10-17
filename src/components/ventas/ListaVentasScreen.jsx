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
    estado: '',
    fechaInicio: '',
    fechaFin: ''
  });

  useEffect(() => {
    loadVentas();
  }, []);

  const loadVentas = async () => {
    try {
      setLoading(true);
      const response = await ventasService.getAll(filtros);
      setVentas(response.data);
    } catch (error) {
      console.error('Error al cargar ventas:', error);
      toast.error('Error al cargar ventas');
    } finally {
      setLoading(false);
    }
  };

  const handleVerDetalle = async (venta) => {
    try {
      const response = await ventasService.getById(venta.id);
      setVentaSeleccionada(response.data);
      setShowModal(true);
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
      estado: '',
      fechaInicio: '',
      fechaFin: ''
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
                  value={filtros.estado}
                  onChange={(e) => setFiltros({ ...filtros, estado: e.target.value })}
                >
                  <option value="">Todos</option>
                  {Object.values(ESTADOS_PEDIDO).map(estado => (
                    <option key={estado} value={estado}>{estado}</option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <Form.Label>Fecha Inicio</Form.Label>
                <Form.Control
                  type="date"
                  value={filtros.fechaInicio}
                  onChange={(e) => setFiltros({ ...filtros, fechaInicio: e.target.value })}
                />
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <Form.Label>Fecha Fin</Form.Label>
                <Form.Control
                  type="date"
                  value={filtros.fechaFin}
                  onChange={(e) => setFiltros({ ...filtros, fechaFin: e.target.value })}
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
                    <th>#</th>
                    <th>Fecha</th>
                    <th>Total</th>
                    <th>Moneda</th>
                    <th>Estado</th>
                    <th>Productos</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {ventas.map((venta) => (
                    <tr key={venta.id}>
                      <td className="fw-bold">#{venta.id}</td>
                      <td>{formatDateTime(venta.createdAt)}</td>
                      <td className="fw-bold">{formatCurrency(venta.total, venta.moneda)}</td>
                      <td>
                        <Badge bg="secondary">{venta.moneda}</Badge>
                      </td>
                      <td>
                        <Badge bg={COLORES_ESTADO[venta.estado] || 'secondary'}>
                          {venta.estado}
                        </Badge>
                      </td>
                      <td>{venta.items?.length || 0} productos</td>
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
        onHide={() => setShowModal(false)}
        venta={ventaSeleccionada}
        onEstadoChange={loadVentas}
      />
    </div>
  );
};

export default ListaVentasScreen;