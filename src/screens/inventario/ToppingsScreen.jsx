
import { useState, useEffect } from 'react';
import { Row, Col, Card, Button, Spinner, Form, Badge, InputGroup, Table } from 'react-bootstrap';
import { toppingsService } from '../../api/services/toppingsService';
import { toast } from 'react-toastify';
import ToppingFormModal from '../../components/toppings/ToppingFormModal';
import AjustarStockModal from '../../components/toppings/AjustarStockModal';
import { formatCurrency } from '../../utils/formatters';
import { useMoneda } from '../../context/MonedaContext';

const ToppingsScreen = () => {
  const [toppings, setToppings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);
  const [toppingEdit, setToppingEdit] = useState(null);
  const [toppingStock, setToppingStock] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const { convertirPrecio } = useMoneda();

  useEffect(() => {
    loadToppings();
  }, []);

  const loadToppings = async () => {
    try {
      setLoading(true);
      const response = await toppingsService.getAll();
      
      if (response.data.success) {
        setToppings(response.data.data || []);
      }
    } catch (error) {
      console.error('Error al cargar toppings:', error);
      toast.error('Error al cargar toppings');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (topping) => {
    setToppingEdit(topping);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de eliminar este topping?')) {
      try {
        await toppingsService.delete(id);
        toast.success('Topping eliminado correctamente');
        loadToppings();
      } catch (error) {
        console.error('Error al eliminar topping:', error);
        toast.error('Error al eliminar topping');
      }
    }
  };

  const handleAjustarStock = (topping) => {
    setToppingStock(topping);
    setShowStockModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setToppingEdit(null);
  };

  const handleCloseStockModal = () => {
    setShowStockModal(false);
    setToppingStock(null);
  };

  const handleSaveSuccess = () => {
    loadToppings();
    handleCloseModal();
  };

  const handleStockSuccess = () => {
    loadToppings();
    handleCloseStockModal();
  };

  const toppingsFiltrados = toppings.filter(topping =>
    topping.nombre_topping.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold">
          <i className="bi bi-stars me-2 text-primary"></i>
          Toppings
        </h2>
        <Button variant="primary" onClick={() => setShowModal(true)}>
          <i className="bi bi-plus-circle me-2"></i>
          Nuevo Topping
        </Button>
      </div>

      {/* Filtros */}
      <Card className="border-0 shadow-sm mb-4">
        <Card.Body>
          <Row>
            <Col md={6} className="d-flex align-items-end">
              <div>
                <Badge bg="secondary">{toppingsFiltrados.length} toppings encontrados</Badge>
              </div>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Tabla de Toppings */}
      {loading ? (
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
        </div>
      ) : toppingsFiltrados.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <Card.Body className="text-center py-5">
            <i className="bi bi-inbox" style={{ fontSize: '4rem', color: '#ccc' }}></i>
            <h5 className="mt-3 text-muted">No hay toppings</h5>
            <p className="text-muted">Agrega tu primer topping para comenzar</p>
          </Card.Body>
        </Card>
      ) : (
        <Card className="border-0 shadow-sm">
          <Card.Body>
            <div className="table-responsive">
              <Table hover>
                <thead className="table-light">
                  <tr>
                    <th>Nombre</th>
                    <th>Descripción</th>
                    <th>Precio Adicional</th>
                    <th>Costo Unitario</th>
                    <th>Stock</th>
                    <th>Stock Mínimo</th>
                    <th>Unidad</th>
                    <th>Estado</th>
                    <th className="text-end">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {toppingsFiltrados.map((topping) => {
                    const stockBajo = topping.stock_actual <= topping.stock_minimo;
                    
                    // Convertir precios según la moneda actual
                    const precioConvertido = convertirPrecio(
                      topping.precio_adicional_cop, 
                      topping.precio_adicional_usd
                    );
                    const costoConvertido = convertirPrecio(
                      topping.costo_unitario_cop, 
                      topping.costo_unitario_usd
                    );
                    
                    return (
                      <tr key={topping.id_topping}>
                        <td className="fw-medium">{topping.nombre_topping}</td>
                        <td className="text-muted small">
                          {topping.descripcion || '-'}
                        </td>
                        <td>
                          {formatCurrency(precioConvertido.monto, precioConvertido.moneda)}
                        </td>
                        <td>
                          {(topping.costo_unitario_cop || topping.costo_unitario_usd) ? 
                            formatCurrency(costoConvertido.monto, costoConvertido.moneda) : 
                            '-'
                          }
                        </td>
                        <td>
                          <Badge bg={stockBajo ? 'danger' : 'success'}>
                            {topping.stock_actual}
                          </Badge>
                        </td>
                        <td>{topping.stock_minimo}</td>
                        <td>
                          <Badge bg="secondary">{topping.unidad_medida}</Badge>
                        </td>
                        <td>
                          {!topping.disponible ? (
                            <Badge bg="danger">
                              <i className="bi bi-x-circle me-1"></i>
                              No disponible
                            </Badge>
                          ) : stockBajo ? (
                            <Badge bg="warning" text="dark">
                              <i className="bi bi-exclamation-triangle me-1"></i>
                              Stock bajo
                            </Badge>
                          ) : (
                            <Badge bg="success">
                              <i className="bi bi-check-circle me-1"></i>
                              Normal
                            </Badge>
                          )}
                        </td>
                        <td className="text-end">
                          <Button
                            variant="outline-info"
                            size="sm"
                            className="me-2"
                            onClick={() => handleAjustarStock(topping)}
                            title="Ajustar Stock"
                          >
                            <i className="bi bi-arrow-repeat"></i>
                          </Button>
                          <Button
                            variant="outline-primary"
                            size="sm"
                            className="me-2"
                            onClick={() => handleEdit(topping)}
                            title="Editar"
                          >
                            <i className="bi bi-pencil"></i>
                          </Button>
                          <Button
                            variant="outline-danger"
                            size="sm"
                            onClick={() => handleDelete(topping.id_topping)}
                            title="Eliminar"
                          >
                            <i className="bi bi-trash"></i>
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </div>
          </Card.Body>
        </Card>
      )}

      {/* Modales */}
      <ToppingFormModal
        show={showModal}
        onHide={handleCloseModal}
        topping={toppingEdit}
        onSaveSuccess={handleSaveSuccess}
      />

      <AjustarStockModal
        show={showStockModal}
        onHide={handleCloseStockModal}
        topping={toppingStock}
        onSuccess={handleStockSuccess}
      />
    </div>
  );
};

export default ToppingsScreen;