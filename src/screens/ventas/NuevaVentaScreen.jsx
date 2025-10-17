import { useState, useEffect } from 'react';
import { Row, Col, Card, Button, Form, Badge, ListGroup } from 'react-bootstrap';
import { productosService } from '../../api/services/productosService';
import { toppingsService } from '../../api/services/toppingsService';
import { ventasService } from '../../api/services/ventasService';
import { monedasService } from '../../api/services/monedasService';
import { toast } from 'react-toastify';
import { formatCurrency } from '../../utils/formatters';

const NuevaVentaScreen = () => {
  const [productos, setProductos] = useState([]);
  const [toppings, setToppings] = useState([]);
  const [monedas, setMonedas] = useState([]);
  const [carrito, setCarrito] = useState([]);
  const [monedaSeleccionada, setMonedaSeleccionada] = useState(1); // id_moneda USD
  const [metodoPago, setMetodoPago] = useState('EFECTIVO');
  const [notas, setNotas] = useState('');
  const [loading, setLoading] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [categorias, setCategorias] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [prodResponse, toppResponse, monedasResponse, catResponse] = await Promise.all([
        productosService.getAll({ disponible: true }),
        toppingsService.getAll({ disponible: true }),
        monedasService.getTasas(),
        productosService.getCategorias()
      ]);
      
      if (prodResponse.data.success) {
        setProductos(prodResponse.data.data || []);
      }
      
      if (toppResponse.data.success) {
        setToppings(toppResponse.data.data || []);
      }

      if (monedasResponse.data.success) {
        setMonedas(monedasResponse.data.data || []);
      }

      if (catResponse.data.success) {
        const nombresCategorias = catResponse.data.data.map(cat => cat.nombre_categoria);
        setCategorias(nombresCategorias);
      }
    } catch (error) {
      console.error('Error al cargar datos:', error);
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const agregarAlCarrito = (producto) => {
    const itemExistente = carrito.find(item => 
      item.id_producto === producto.id_producto && item.toppings.length === 0
    );

    if (itemExistente) {
      setCarrito(carrito.map(item =>
        item.carritoId === itemExistente.carritoId
          ? { ...item, cantidad: item.cantidad + 1 }
          : item
      ));
    } else {
      setCarrito([...carrito, {
        carritoId: Date.now(),
        id_producto: producto.id_producto,
        nombre_producto: producto.nombre_producto,
        precio_base: parseFloat(producto.precio_base),
        cantidad: 1,
        toppings: [],
        imagen_url: producto.imagen_url
      }]);
    }
    toast.success(`${producto.nombre_producto} agregado al carrito`);
  };

  const agregarTopping = (carritoId, topping) => {
    setCarrito(carrito.map(item => {
      if (item.carritoId === carritoId) {
        const toppingYaAgregado = item.toppings.find(t => t.id_topping === topping.id_topping);
        if (toppingYaAgregado) {
          toast.warning('Este topping ya fue agregado');
          return item;
        }
        return {
          ...item,
          toppings: [...item.toppings, {
            id_topping: topping.id_topping,
            nombre_topping: topping.nombre_topping,
            precio_adicional: parseFloat(topping.precio_adicional),
            cantidad: 1
          }]
        };
      }
      return item;
    }));
  };

  const removerTopping = (carritoId, toppingId) => {
    setCarrito(carrito.map(item => {
      if (item.carritoId === carritoId) {
        return {
          ...item,
          toppings: item.toppings.filter(t => t.id_topping !== toppingId)
        };
      }
      return item;
    }));
  };

  const actualizarCantidad = (carritoId, cantidad) => {
    if (cantidad <= 0) {
      setCarrito(carrito.filter(item => item.carritoId !== carritoId));
    } else {
      setCarrito(carrito.map(item =>
        item.carritoId === carritoId ? { ...item, cantidad } : item
      ));
    }
  };

  const removerDelCarrito = (carritoId) => {
    setCarrito(carrito.filter(item => item.carritoId !== carritoId));
  };

  const calcularSubtotal = (item) => {
    const precioBase = item.precio_base * item.cantidad;
    const precioToppings = item.toppings.reduce((sum, t) => sum + (t.precio_adicional * t.cantidad), 0) * item.cantidad;
    return precioBase + precioToppings;
  };

  const calcularTotal = () => {
    return carrito.reduce((total, item) => total + calcularSubtotal(item), 0);
  };

  const procesarVenta = async () => {
    if (carrito.length === 0) {
      toast.error('El carrito está vacío');
      return;
    }

    try {
      setProcesando(true);

      // Estructura según la API
      const ventaData = {
        productos: carrito.map(item => ({
          id_producto: item.id_producto,
          cantidad: item.cantidad,
          toppings: item.toppings.map(t => ({
            id_topping: t.id_topping,
            cantidad: t.cantidad
          }))
        })),
        id_moneda: parseInt(monedaSeleccionada),
        metodo_pago: metodoPago,
        notas: notas.trim() || null
      };

      const response = await ventasService.create(ventaData);
      
      if (response.data.success) {
        toast.success('¡Venta procesada exitosamente!');
        toast.info(`Factura: ${response.data.data.numero_factura}`);
        setCarrito([]);
        setNotas('');
        loadData(); // Recargar para actualizar stocks
      }
    } catch (error) {
      console.error('Error al procesar venta:', error);
      toast.error(error.response?.data?.message || 'Error al procesar venta');
    } finally {
      setProcesando(false);
    }
  };

  const productosFiltrados = filtroCategoria
    ? productos.filter(p => p.nombre_categoria === filtroCategoria)
    : productos;

  const monedaActual = monedas.find(m => m.id_moneda === parseInt(monedaSeleccionada));
  const totalUSD = calcularTotal();

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold">
          <i className="bi bi-cart-plus me-2 text-primary"></i>
          Nueva Venta
        </h2>
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
                  {categorias.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </Form.Select>
              </div>

              {loading ? (
                <div className="text-center py-4">Cargando productos...</div>
              ) : (
                <Row>
                  {productosFiltrados.map(producto => (
                    <Col key={producto.id_producto} md={6} lg={4} className="mb-3">
                      <Card 
                        className="h-100 border-0 shadow-sm"
                        style={{ cursor: 'pointer' }}
                        onClick={() => agregarAlCarrito(producto)}
                      >
                        {producto.imagen_url ? (
                          <Card.Img
                            variant="top"
                            src={producto.imagen_url}
                            style={{ height: '150px', objectFit: 'cover' }}
                          />
                        ) : (
                          <div
                            className="bg-light d-flex align-items-center justify-content-center"
                            style={{ height: '150px' }}
                          >
                            <i className="bi bi-image text-muted" style={{ fontSize: '2rem' }}></i>
                          </div>
                        )}
                        <Card.Body>
                          <Badge bg="primary" className="mb-2">{producto.nombre_categoria}</Badge>
                          <Card.Title className="mb-1 small">{producto.nombre_producto}</Card.Title>
                          <div className="d-flex justify-content-between align-items-center">
                            <strong className="text-primary">
                              {formatCurrency(producto.precio_base, 'USD')}
                            </strong>
                            <Badge bg={producto.disponible ? 'success' : 'danger'}>
                              {producto.disponible ? 'Disponible' : 'No disponible'}
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
                <i className="bi bi-cart3 me-2"></i>
                Carrito ({carrito.length})
              </h5>
            </Card.Header>
            <Card.Body style={{ maxHeight: '500px', overflowY: 'auto' }}>
              {carrito.length === 0 ? (
                <div className="text-center py-5 text-muted">
                  <i className="bi bi-cart-x" style={{ fontSize: '3rem' }}></i>
                  <p className="mt-2">El carrito está vacío</p>
                </div>
              ) : (
                <ListGroup variant="flush">
                  {carrito.map(item => (
                    <ListGroup.Item key={item.carritoId} className="px-0">
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <div className="flex-grow-1">
                          <strong>{item.nombre_producto}</strong>
                          <div className="small text-muted">
                            {formatCurrency(item.precio_base, 'USD')} x {item.cantidad}
                          </div>
                        </div>
                        <Button
                          variant="link"
                          size="sm"
                          className="text-danger p-0"
                          onClick={() => removerDelCarrito(item.carritoId)}
                        >
                          <i className="bi bi-trash"></i>
                        </Button>
                      </div>

                      {/* Toppings agregados */}
                      {item.toppings.length > 0 && (
                        <div className="mb-2">
                          {item.toppings.map(topping => (
                            <Badge
                              key={topping.id_topping}
                              bg="secondary"
                              className="me-1 mb-1"
                            >
                              {topping.nombre_topping} (+{formatCurrency(topping.precio_adicional, 'USD')})
                              <i
                                className="bi bi-x ms-1"
                                style={{ cursor: 'pointer' }}
                                onClick={() => removerTopping(item.carritoId, topping.id_topping)}
                              ></i>
                            </Badge>
                          ))}
                        </div>
                      )}

                      {/* Selector de toppings */}
                      <Form.Select
                        size="sm"
                        onChange={(e) => {
                          const topping = toppings.find(t => t.id_topping === parseInt(e.target.value));
                          if (topping) {
                            agregarTopping(item.carritoId, topping);
                            e.target.value = '';
                          }
                        }}
                      >
                        <option value="">+ Agregar topping</option>
                        {toppings.map(topping => (
                          <option key={topping.id_topping} value={topping.id_topping}>
                            {topping.nombre_topping} (+{formatCurrency(topping.precio_adicional, 'USD')})
                          </option>
                        ))}
                      </Form.Select>

                      {/* Cantidad */}
                      <div className="d-flex align-items-center gap-2 mt-2">
                        <Button
                          variant="outline-secondary"
                          size="sm"
                          onClick={() => actualizarCantidad(item.carritoId, item.cantidad - 1)}
                        >
                          <i className="bi bi-dash"></i>
                        </Button>
                        <span className="fw-bold">{item.cantidad}</span>
                        <Button
                          variant="outline-secondary"
                          size="sm"
                          onClick={() => actualizarCantidad(item.carritoId, item.cantidad + 1)}
                        >
                          <i className="bi bi-plus"></i>
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
                {/* Método de pago */}
                <Form.Group className="mb-3">
                  <Form.Label className="small fw-bold">Método de Pago</Form.Label>
                  <Form.Select
                    size="sm"
                    value={metodoPago}
                    onChange={(e) => setMetodoPago(e.target.value)}
                  >
                    <option value="EFECTIVO">Efectivo</option>
                    <option value="TARJETA">Tarjeta</option>
                    <option value="TRANSFERENCIA">Transferencia</option>
                    <option value="PAGO_MOVIL">Pago Móvil</option>
                  </Form.Select>
                </Form.Group>

                {/* Moneda */}
                <Form.Group className="mb-3">
                  <Form.Label className="small fw-bold">Moneda</Form.Label>
                  <Form.Select
                    size="sm"
                    value={monedaSeleccionada}
                    onChange={(e) => setMonedaSeleccionada(e.target.value)}
                  >
                    {monedas.map(moneda => (
                      <option key={moneda.id_moneda} value={moneda.id_moneda}>
                        {moneda.codigo_moneda} ({moneda.simbolo})
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>

                {/* Notas */}
                <Form.Group className="mb-3">
                  <Form.Label className="small fw-bold">Notas</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={2}
                    size="sm"
                    placeholder="Ej: Sin nueces..."
                    value={notas}
                    onChange={(e) => setNotas(e.target.value)}
                  />
                </Form.Group>

                <div className="d-flex justify-content-between align-items-center mb-3">
                  <strong>Total:</strong>
                  <h5 className="mb-0 text-success">
                    {monedaActual?.simbolo || '$'} {totalUSD.toFixed(2)}
                  </h5>
                </div>

                <Button
                  variant="success"
                  className="w-100"
                  size="lg"
                  onClick={procesarVenta}
                  disabled={procesando}
                >
                  {procesando ? 'Procesando...' : (
                    <>
                      <i className="bi bi-check-circle me-2"></i>
                      Procesar Venta
                    </>
                  )}
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