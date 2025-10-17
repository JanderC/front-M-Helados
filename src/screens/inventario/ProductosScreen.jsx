import { useState, useEffect } from 'react';
import { Row, Col, Card, Button, Spinner, Form, Badge, InputGroup } from 'react-bootstrap';
import { productosService } from '../../api/services/productosService';
import { toast } from 'react-toastify';
import ProductoFormModal from '../../components/productos/ProductoFormModal';
import ProductoCard from '../../components/productos/ProductoCard';

const ProductosScreen = () => {
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [productoEdit, setProductoEdit] = useState(null);
  const [filtros, setFiltros] = useState({
    categoria: '',
    busqueda: ''
  });

  useEffect(() => {
    loadProductos();
    loadCategorias();
  }, []);

  const loadProductos = async () => {
    try {
      setLoading(true);
      const response = await productosService.getAll();
      
      if (response.data.success) {
        setProductos(response.data.data || []);
      }
    } catch (error) {
      console.error('Error al cargar productos:', error);
      toast.error('Error al cargar productos');
    } finally {
      setLoading(false);
    }
  };

  const loadCategorias = async () => {
    try {
      const response = await productosService.getCategorias();
      
      if (response.data.success) {
        // Extraer solo los nombres de categoría
        const nombresCategorias = response.data.data.map(cat => cat.nombre_categoria);
        setCategorias(nombresCategorias);
      }
    } catch (error) {
      console.error('Error al cargar categorías:', error);
    }
  };

  const handleEdit = (producto) => {
    setProductoEdit(producto);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de eliminar este producto?')) {
      try {
        await productosService.delete(id);
        toast.success('Producto eliminado correctamente');
        loadProductos();
      } catch (error) {
        console.error('Error al eliminar producto:', error);
        toast.error('Error al eliminar producto');
      }
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setProductoEdit(null);
  };

  const handleSaveSuccess = () => {
    loadProductos();
    handleCloseModal();
  };

  const productosFiltrados = productos.filter(producto => {
    const matchCategoria = !filtros.categoria || producto.nombre_categoria === filtros.categoria;
    const matchBusqueda = !filtros.busqueda || 
      producto.nombre_producto.toLowerCase().includes(filtros.busqueda.toLowerCase()) ||
      producto.descripcion?.toLowerCase().includes(filtros.busqueda.toLowerCase());
    
    return matchCategoria && matchBusqueda;
  });

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold">
          <i className="bi bi-box-seam me-2 text-primary"></i>
          Productos
        </h2>
        <Button variant="primary" onClick={() => setShowModal(true)}>
          <i className="bi bi-plus-circle me-2"></i>
          Nuevo Producto
        </Button>
      </div>

      {/* Filtros */}
      <Card className="border-0 shadow-sm mb-4">
        <Card.Body>
          <Row>
            <Col md={6}>
              <Form.Group>
                <Form.Label>Buscar</Form.Label>
                <InputGroup>
                  <InputGroup.Text>
                    <i className="bi bi-search"></i>
                  </InputGroup.Text>
                  <Form.Control
                    type="text"
                    placeholder="Buscar por nombre o descripción..."
                    value={filtros.busqueda}
                    onChange={(e) => setFiltros({ ...filtros, busqueda: e.target.value })}
                  />
                </InputGroup>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label>Categoría</Form.Label>
                <Form.Select
                  value={filtros.categoria}
                  onChange={(e) => setFiltros({ ...filtros, categoria: e.target.value })}
                >
                  <option value="">Todas las categorías</option>
                  {categorias.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Productos */}
      {loading ? (
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
        </div>
      ) : productosFiltrados.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <Card.Body className="text-center py-5">
            <i className="bi bi-inbox" style={{ fontSize: '4rem', color: '#ccc' }}></i>
            <h5 className="mt-3 text-muted">No hay productos</h5>
            <p className="text-muted">Agrega tu primer producto para comenzar</p>
          </Card.Body>
        </Card>
      ) : (
        <>
          <div className="mb-3">
            <Badge bg="secondary">{productosFiltrados.length} productos encontrados</Badge>
          </div>
          <Row>
            {productosFiltrados.map((producto) => (
              <Col key={producto.id_producto} md={6} lg={4} xl={3} className="mb-4">
                <ProductoCard
                  producto={producto}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              </Col>
            ))}
          </Row>
        </>
      )}

      {/* Modal de formulario */}
      <ProductoFormModal
        show={showModal}
        onHide={handleCloseModal}
        producto={productoEdit}
        onSaveSuccess={handleSaveSuccess}
        categorias={categorias}
      />
    </div>
  );
};

export default ProductosScreen;