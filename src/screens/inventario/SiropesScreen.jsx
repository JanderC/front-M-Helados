import { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Table, Badge, Form } from 'react-bootstrap';
import { siropesService } from '../../api/services/siropesService';
import SiropeFormModal from '../../components/siropes/SiropeFormModal';
import AjustarStockSiropeModal from '../../components/siropes/AjustarStockSiropeModal';
import { toast } from 'react-toastify';
import { useMoneda } from '../../context/MonedaContext';

const SiropesScreen = () => {
  const [siropes, setSiropes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);
  const [selectedSirope, setSelectedSirope] = useState(null);
  const [filtroDisponible, setFiltroDisponible] = useState('todos');
  const { formatCurrency, monedaActual } = useMoneda();

  useEffect(() => {
    loadSiropes();
  }, [filtroDisponible]);

  const loadSiropes = async () => {
    try {
      setLoading(true);
      const params = {};
      
      if (filtroDisponible !== 'todos') {
        params.disponible = filtroDisponible === 'disponibles';
      }

      const response = await siropesService.getAll(params);
      setSiropes(response.data.data);
    } catch (error) {
      console.error('Error al cargar siropes:', error);
      toast.error('Error al cargar siropes');
    } finally {
      setLoading(false);
    }
  };

  const handleNuevoSirope = () => {
    setSelectedSirope(null);
    setShowModal(true);
  };

  const handleEditarSirope = (sirope) => {
    setSelectedSirope(sirope);
    setShowModal(true);
  };

  const handleAjustarStock = (sirope) => {
    setSelectedSirope(sirope);
    setShowStockModal(true);
  };

  const handleEliminarSirope = async (id, nombre) => {
    if (!window.confirm(`¿Estás seguro de eliminar el sirope "${nombre}"?`)) {
      return;
    }

    try {
      await siropesService.delete(id);
      toast.success('Sirope eliminado correctamente');
      loadSiropes();
    } catch (error) {
      console.error('Error al eliminar sirope:', error);
      toast.error(error.response?.data?.message || 'Error al eliminar sirope');
    }
  };

  const handleSaveSuccess = () => {
    setShowModal(false);
    setShowStockModal(false);
    setSelectedSirope(null);
    loadSiropes();
  };

  const getPrecioMostrar = (sirope) => {
    if (monedaActual === 'COP') {
      return formatCurrency(sirope.precio_adicional_cop, 'COP');
    } else {
      return formatCurrency(sirope.precio_adicional_usd, 'USD');
    }
  };

  const getBadgeStock = (sirope) => {
    const stock = parseFloat(sirope.stock_actual);
    const minimo = parseFloat(sirope.stock_minimo);
    
    if (stock <= 0) return 'danger';
    if (stock <= minimo) return 'warning';
    return 'success';
  };

  return (
    <Container fluid className="py-4">
      {/* Header */}
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h2>
                <i className="bi bi-droplet-half me-2 text-primary"></i>
                Siropes
              </h2>
              <p className="text-muted mb-0">
                Gestión de siropes disponibles para los helados
              </p>
            </div>
            <Button 
              variant="primary" 
              size="lg"
              onClick={handleNuevoSirope}
            >
              <i className="bi bi-plus-circle me-2"></i>
              Nuevo Sirope
            </Button>
          </div>
        </Col>
      </Row>

      {/* Filtros y estadísticas */}
      <Row className="mb-4">
        <Col md={3}>
          <Card className="border-0 shadow-sm">
            <Card.Body>
              <div className="d-flex align-items-center">
                <div className="bg-primary bg-opacity-10 p-3 rounded me-3">
                  <i className="bi bi-droplet-half text-primary fs-4"></i>
                </div>
                <div>
                  <h6 className="text-muted mb-0">Total Siropes</h6>
                  <h3 className="mb-0">{siropes.length}</h3>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={3}>
          <Card className="border-0 shadow-sm">
            <Card.Body>
              <div className="d-flex align-items-center">
                <div className="bg-success bg-opacity-10 p-3 rounded me-3">
                  <i className="bi bi-check-circle text-success fs-4"></i>
                </div>
                <div>
                  <h6 className="text-muted mb-0">Disponibles</h6>
                  <h3 className="mb-0">
                    {siropes.filter(s => s.disponible).length}
                  </h3>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={3}>
          <Card className="border-0 shadow-sm">
            <Card.Body>
              <div className="d-flex align-items-center">
                <div className="bg-warning bg-opacity-10 p-3 rounded me-3">
                  <i className="bi bi-exclamation-triangle text-warning fs-4"></i>
                </div>
                <div>
                  <h6 className="text-muted mb-0">Stock Bajo</h6>
                  <h3 className="mb-0">
                    {siropes.filter(s => parseFloat(s.stock_actual) <= parseFloat(s.stock_minimo)).length}
                  </h3>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col md={3}>
          <Form.Group>
            <Form.Label>Filtrar por estado</Form.Label>
            <Form.Select
              value={filtroDisponible}
              onChange={(e) => setFiltroDisponible(e.target.value)}
            >
              <option value="todos">Todos</option>
              <option value="disponibles">Disponibles</option>
              <option value="no_disponibles">No Disponibles</option>
            </Form.Select>
          </Form.Group>
        </Col>
      </Row>

      {/* Tabla de siropes */}
      <Row>
        <Col>
          <Card className="border-0 shadow-sm">
            <Card.Body>
              {loading ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Cargando...</span>
                  </div>
                </div>
              ) : siropes.length === 0 ? (
                <div className="text-center py-5">
                  <i className="bi bi-droplet-half fs-1 text-muted"></i>
                  <p className="text-muted mt-3">No hay siropes registrados</p>
                  <Button variant="primary" onClick={handleNuevoSirope}>
                    Crear primer sirope
                  </Button>
                </div>
              ) : (
                <Table responsive hover>
                  <thead className="table-light">
                    <tr>
                      <th>Sirope</th>
                      <th>Descripción</th>
                      <th>Precio Adicional</th>
                      <th className="text-center">Stock</th>
                      <th className="text-center">Estado</th>
                      <th className="text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {siropes.map((sirope) => (
                      <tr key={sirope.id_sirope}>
                        <td>
                          <div className="d-flex align-items-center">
                            <i className="bi bi-droplet-half text-primary me-2"></i>
                            <strong>{sirope.nombre_sirope}</strong>
                          </div>
                        </td>
                        <td>
                          <small className="text-muted">
                            {sirope.descripcion || 'Sin descripción'}
                          </small>
                        </td>
                        <td>
                          <div>
                            <div>{getPrecioMostrar(sirope)}</div>
                          </div>
                        </td>
                        <td className="text-center">
                          <Badge bg={getBadgeStock(sirope)}>
                            {parseFloat(sirope.stock_actual).toFixed(2)} {sirope.unidad_medida}
                          </Badge>
                          {parseFloat(sirope.stock_actual) <= parseFloat(sirope.stock_minimo) && (
                            <div className="small text-warning mt-1">
                              <i className="bi bi-exclamation-triangle me-1"></i>
                              Bajo stock
                            </div>
                          )}
                        </td>
                        <td className="text-center">
                          <Badge bg={sirope.disponible ? 'success' : 'secondary'}>
                            {sirope.disponible ? 'Disponible' : 'No Disponible'}
                          </Badge>
                        </td>
                        <td className="text-center">
                          <Button
                            variant="outline-info"
                            size="sm"
                            className="me-2"
                            onClick={() => handleAjustarStock(sirope)}
                            title="Ajustar Stock"
                          >
                            <i className="bi bi-arrow-repeat"></i>
                          </Button>
                          <Button
                            variant="outline-primary"
                            size="sm"
                            className="me-2"
                            onClick={() => handleEditarSirope(sirope)}
                          >
                            <i className="bi bi-pencil"></i>
                          </Button>
                          <Button
                            variant="outline-danger"
                            size="sm"
                            onClick={() => handleEliminarSirope(sirope.id_sirope, sirope.nombre_sirope)}
                          >
                            <i className="bi bi-trash"></i>
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Modal de formulario */}
      <SiropeFormModal
        show={showModal}
        onHide={() => setShowModal(false)}
        sirope={selectedSirope}
        onSaveSuccess={handleSaveSuccess}
      />

      {/* Modal de ajustar stock */}
      <AjustarStockSiropeModal
        show={showStockModal}
        onHide={() => setShowStockModal(false)}
        sirope={selectedSirope}
        onSuccess={handleSaveSuccess}
      />
    </Container>
  );
};

export default SiropesScreen;