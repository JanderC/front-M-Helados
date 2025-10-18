import { useState, useEffect } from 'react';
import { Row, Col, Card, Button, Form, Badge, ListGroup, Alert, Table } from 'react-bootstrap';

const NuevaVentaScreen = () => {
  const [productos, setProductos] = useState([]);
  const [toppings, setToppings] = useState([]);
  const [tasas, setTasas] = useState({ USD: 1, VES: 36, COP: 4000 });
  const [carrito, setCarrito] = useState([]);
  const [monedaSeleccionada, setMonedaSeleccionada] = useState('USD');
  const [loading, setLoading] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [categorias, setCategorias] = useState([]);
  const [ventasRecientes, setVentasRecientes] = useState([]);
  const [showDetalleModal, setShowDetalleModal] = useState(false);
  const [ventaSeleccionada, setVentaSeleccionada] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      // Simulación de carga de datos
      const categoriasData = [
        { id_categoria: 1, nombre_categoria: 'Helados' },
        { id_categoria: 2, nombre_categoria: 'Batidos' },
        { id_categoria: 3, nombre_categoria: 'Postres' }
      ];
      
      setCategorias(categoriasData);
      setProductos([
        { id: 1, nombre: 'Helado de Vainilla', precio: 3.50, stock: 10, categoria: 'Helados', imagenUrl: null },
        { id: 2, nombre: 'Batido de Fresa', precio: 4.00, stock: 5, categoria: 'Batidos', imagenUrl: null }
      ]);
      setToppings([
        { id: 1, nombre: 'Chispas', precio: 0.50 },
        { id: 2, nombre: 'Caramelo', precio: 0.75 }
      ]);
      setVentasRecientes([]);
    } catch (error) {
      console.error('Error al cargar datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const agregarAlCarrito = (producto) => {
    if (producto.stock <= 0) {
      alert('Producto sin stock disponible');
      return;
    }

    const itemExistente = carrito.find(item => 
      item.productoId === producto.id && item.toppings.length === 0
    );

    if (itemExistente) {
      setCarrito(carrito.map(item =>
        item.id === itemExistente.id
          ? { ...item, cantidad: item.cantidad + 1 }
          : item
      ));
    } else {
      setCarrito([...carrito, {
        id: Date.now(),
        productoId: producto.id,
        nombre: producto.nombre,
        precio: producto.precio,
        cantidad: 1,
        toppings: [],
        imagenUrl: producto.imagenUrl
      }]);
    }
  };

  const agregarTopping = (itemId, topping) => {
    setCarrito(carrito.map(item => {
      if (item.id === itemId) {
        const toppingYaAgregado = item.toppings.find(t => t.id === topping.id);
        if (toppingYaAgregado) {
          alert('Este topping ya fue agregado');
          return item;
        }
        return {
          ...item,
          toppings: [...item.toppings, {
            id: topping.id,
            nombre: topping.nombre,
            precio: topping.precio
          }]
        };
      }
      return item;
    }));
  };

  const removerTopping = (itemId, toppingId) => {
    setCarrito(carrito.map(item => {
      if (item.id === itemId) {
        return {
          ...item,
          toppings: item.toppings.filter(t => t.id !== toppingId)
        };
      }
      return item;
    }));
  };

  const actualizarCantidad = (itemId, cantidad) => {
    if (cantidad <= 0) {
      setCarrito(carrito.filter(item => item.id !== itemId));
    } else {
      setCarrito(carrito.map(item =>
        item.id === itemId ? { ...item, cantidad } : item
      ));
    }
  };

  const removerDelCarrito = (itemId) => {
    setCarrito(carrito.filter(item => item.id !== itemId));
  };

  const calcularSubtotal = (item) => {
    const precioBase = item.precio * item.cantidad;
    const precioToppings = item.toppings.reduce((sum, t) => sum + t.precio, 0) * item.cantidad;
    return precioBase + precioToppings;
  };

  const calcularTotal = () => {
    return carrito.reduce((total, item) => total + calcularSubtotal(item), 0);
  };

  const formatCurrency = (amount, currency) => {
    const symbols = { USD: '$', VES: 'Bs.', COP: 'COP$' };
    return `${symbols[currency] || '$'}${amount.toFixed(2)}`;
  };

  const procesarVenta = async () => {
    if (carrito.length === 0) {
      alert('El carrito está vacío');
      return;
    }

    try {
      setProcesando(true);
      // Simulación de procesamiento
      await new Promise(resolve => setTimeout(resolve, 1000));
      alert('¡Venta procesada exitosamente!');
      setCarrito([]);
      loadData();
    } catch (error) {
      console.error('Error al procesar venta:', error);
      alert('Error al procesar venta');
    } finally {
      setProcesando(false);
    }
  };

  // CORRECCIÓN: Filtrar por nombre_categoria en lugar de categoria
  const productosFiltrados = filtroCategoria
  ? productos.filter(p => p.nombre_categoria === filtroCategoria)
  : productos;

  const totalUSD = calcularTotal();
  const totalMoneda = totalUSD * (tasas[monedaSeleccionada] || 1);

  return (
    <div className="p-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold">
          🛒 Nueva Venta
        </h2>
        <div className="d-flex gap-2">
          <Form.Select
            value={monedaSeleccionada}
            onChange={(e) => setMonedaSeleccionada(e.target.value)}
            style={{ width: '150px' }}
          >
            <option value="USD">USD ($)</option>
            <option value="VES">VES (Bs.)</option>
            <option value="COP">COP (COP$)</option>
          </Form.Select>
        </div>
      </div>

      <Row>
        {/* Productos */}
        <Col lg={8}>
          <Card className="border-0 shadow-sm mb-4">
            <Card.Body>
              <div className="mb-3">
                <Form.Select
                  value={filtroCategoria}
                  onChange={(e) => setFiltroCategoria(e.target.value)}
                >
                  <option value="">Todas las categorías</option>
                  {/* CORRECCIÓN: Acceder a nombre_categoria */}
                  {categorias.map(cat => (
                    <option key={cat.id_categoria} value={cat.nombre_categoria}>
                      {cat.nombre_categoria}
                    </option>
                  ))}
                </Form.Select>
              </div>

              {loading ? (
                <div className="text-center py-4">Cargando productos...</div>
              ) : (
                <Row>
                  {productosFiltrados.map(producto => (
                    <Col key={producto.id} md={6} lg={4} className="mb-3">
                      <Card 
                        className="h-100 border-0 shadow-sm"
                        style={{ cursor: 'pointer' }}
                        onClick={() => agregarAlCarrito(producto)}
                      >
                        {producto.imagenUrl ? (
                          <Card.Img
                            variant="top"
                            src={producto.imagenUrl}
                            style={{ height: '150px', objectFit: 'cover' }}
                          />
                        ) : (
                          <div
                            className="bg-light d-flex align-items-center justify-content-center"
                            style={{ height: '150px' }}
                          >
                            <span style={{ fontSize: '2rem' }}>🍦</span>
                          </div>
                        )}
                        <Card.Body>
                          <Badge bg="primary" className="mb-2">{producto.categoria}</Badge>
                          <Card.Title className="mb-1 small">{producto.nombre}</Card.Title>
                          <div className="d-flex justify-content-between align-items-center">
                            <strong className="text-primary">
                              {formatCurrency(producto.precio, 'USD')}
                            </strong>
                            <Badge bg={producto.stock > 0 ? 'success' : 'danger'}>
                              Stock: {producto.stock}
                            </Badge>
                          </div>
                        </Card.Body>
                      </Card>
                    </Col>
                  ))}
                </Row>
              )}
            </Card.Body>
          </Card>
        </Col>

        {/* Carrito */}
        <Col lg={4}>
          <Card className="border-0 shadow-sm sticky-top" style={{ top: '80px' }}>
            <Card.Header className="bg-primary text-white">
              <h5 className="mb-0">
                🛒 Carrito ({carrito.length})
              </h5>
            </Card.Header>
            <Card.Body style={{ maxHeight: '500px', overflowY: 'auto' }}>
              {carrito.length === 0 ? (
                <div className="text-center py-5 text-muted">
                  <div style={{ fontSize: '3rem' }}>🛒</div>
                  <p className="mt-2">El carrito está vacío</p>
                </div>
              ) : (
                <ListGroup variant="flush">
                  {carrito.map(item => (
                    <ListGroup.Item key={item.id} className="px-0">
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <div className="flex-grow-1">
                          <strong>{item.nombre}</strong>
                          <div className="small text-muted">
                            {formatCurrency(item.precio, 'USD')} x {item.cantidad}
                          </div>
                        </div>
                        <Button
                          variant="link"
                          size="sm"
                          className="text-danger p-0"
                          onClick={() => removerDelCarrito(item.id)}
                        >
                          🗑️
                        </Button>
                      </div>

                      {item.toppings.length > 0 && (
                        <div className="mb-2">
                          {item.toppings.map(topping => (
                            <Badge
                              key={topping.id}
                              bg="secondary"
                              className="me-1 mb-1"
                            >
                              {topping.nombre} (+{formatCurrency(topping.precio, 'USD')})
                              <span
                                className="ms-1"
                                style={{ cursor: 'pointer' }}
                                onClick={() => removerTopping(item.id, topping.id)}
                              >
                                ✕
                              </span>
                            </Badge>
                          ))}
                        </div>
                      )}

                      <Form.Select
                        size="sm"
                        onChange={(e) => {
                          const topping = toppings.find(t => t.id === parseInt(e.target.value));
                          if (topping) {
                            agregarTopping(item.id, topping);
                            e.target.value = '';
                          }
                        }}
                      >
                        <option value="">+ Agregar topping</option>
                        {toppings.map(topping => (
                          <option key={topping.id} value={topping.id}>
                            {topping.nombre} (+{formatCurrency(topping.precio, 'USD')})
                          </option>
                        ))}
                      </Form.Select>

                      <div className="d-flex align-items-center gap-2 mt-2">
                        <Button
                          variant="outline-secondary"
                          size="sm"
                          onClick={() => actualizarCantidad(item.id, item.cantidad - 1)}
                        >
                          −
                        </Button>
                        <span className="fw-bold">{item.cantidad}</span>
                        <Button
                          variant="outline-secondary"
                          size="sm"
                          onClick={() => actualizarCantidad(item.id, item.cantidad + 1)}
                        >
                          +
                        </Button>
                        <div className="ms-auto fw-bold">
                          {formatCurrency(calcularSubtotal(item), 'USD')}
                        </div>
                      </div>
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              )}
            </Card.Body>
            
            {carrito.length > 0 && (
              <Card.Footer className="bg-light">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <strong>Total USD:</strong>
                  <h5 className="mb-0 text-primary">{formatCurrency(totalUSD, 'USD')}</h5>
                </div>
                {monedaSeleccionada !== 'USD' && (
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <strong>Total {monedaSeleccionada}:</strong>
                    <h5 className="mb-0 text-success">
                      {formatCurrency(totalMoneda, monedaSeleccionada)}
                    </h5>
                  </div>
                )}
                <Button
                  variant="success"
                  className="w-100"
                  size="lg"
                  onClick={procesarVenta}
                  disabled={procesando}
                >
                  {procesando ? 'Procesando...' : '✓ Procesar Venta'}
                </Button>
              </Card.Footer>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default NuevaVentaScreen;