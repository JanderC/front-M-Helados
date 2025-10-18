import { useState, useEffect } from 'react';
import { Row, Col, Card, Button, Form, Badge, ListGroup, Alert, Table } from 'react-bootstrap';
import { productosService } from '../../api/services/productosService';
import { toppingsService } from '../../api/services/toppingsService';
import { ventasService } from '../../api/services/ventasService';
import { monedasService } from '../../api/services/monedasService';
import { toast } from 'react-toastify';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import DetalleVentaModal from '../../components/ventas/DetalleVentaModal';

const NuevaVentaScreen = () => {
  const [productos, setProductos] = useState([]);
  const [toppings, setToppings] = useState([]);
  const [tasas, setTasas] = useState({ USD: 1, VES: 36, COP: 4000 });
  const [monedas, setMonedas] = useState([]);
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
      const [prodResponse, toppResponse, tasasResponse, catResponse, ventasResponse] = await Promise.all([
        productosService.getAll(),
        toppingsService.getAll(),
        monedasService.getTasas(),
        productosService.getCategorias(),
        ventasService.getAll({ limit: 10 })
      ]);
      
      setProductos(prodResponse.data?.data || prodResponse.data || []);
      setToppings(toppResponse.data?.data || toppResponse.data || []);
      
      // Guardar tanto las tasas como el array completo de monedas
      const monedasData = tasasResponse.data?.data || tasasResponse.data;
      if (Array.isArray(monedasData)) {
        setMonedas(monedasData);
        // Convertir array a objeto de tasas para facilitar cálculos
        const tasasObj = {};
        monedasData.forEach(m => {
          tasasObj[m.codigo_moneda] = parseFloat(m.tasa_cambio_usd);
        });
        setTasas(tasasObj);
      } else {
        setTasas(monedasData || { USD: 1, VES: 36, COP: 4000 });
      }
      
      setCategorias(catResponse.data?.data || catResponse.data || []);
      setVentasRecientes(ventasResponse.data?.data || ventasResponse.data || []);
    } catch (error) {
      console.error('Error al cargar datos:', error);
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const agregarAlCarrito = (producto) => {
    if (!producto.disponible) {
      toast.error('Producto no disponible');
      return;
    }

    const itemExistente = carrito.find(item => 
      item.id_producto === producto.id_producto && item.toppings.length === 0
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
        id_producto: producto.id_producto,
        nombre: producto.nombre_producto,
        precio: parseFloat(producto.precio_base),
        cantidad: 1,
        toppings: [],
        imagenUrl: producto.imagen_url
      }]);
    }
  };

  const agregarTopping = (itemId, topping) => {
    setCarrito(carrito.map(item => {
      if (item.id === itemId) {
        const toppingYaAgregado = item.toppings.find(t => t.id_topping === topping.id_topping);
        if (toppingYaAgregado) {
          toast.warning('Este topping ya fue agregado');
          return item;
        }
        return {
          ...item,
          toppings: [...item.toppings, {
            id_topping: topping.id_topping,
            nombre: topping.nombre_topping,
            precio: parseFloat(topping.precio_adicional)
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
          toppings: item.toppings.filter(t => t.id_topping !== toppingId)
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

  const procesarVenta = async () => {
    if (carrito.length === 0) {
      toast.error('El carrito está vacío');
      return;
    }

    try {
      setProcesando(true);

      // Buscar el id_moneda correspondiente al código seleccionado
      const monedaObj = monedas.find(m => m.codigo_moneda === monedaSeleccionada);
      
      if (!monedaObj) {
        toast.error('Moneda no válida');
        return;
      }

      // Estructura que el backend espera
      const ventaData = {
        productos: carrito.map(item => ({
          id_producto: item.id_producto,
          cantidad: item.cantidad,
          precio_unitario: item.precio,
          toppings: item.toppings.map(t => ({
            id_topping: t.id_topping,
            precio_unitario: t.precio
          }))
        })),
        id_moneda: monedaObj.id_moneda, // Usar el ID de la moneda
        monto_total: calcularTotal()
      };

      console.log('Enviando venta:', ventaData);
      const response = await ventasService.create(ventaData);
      console.log('Respuesta:', response.data);
      
      toast.success('¡Venta procesada exitosamente!');
      setCarrito([]);
      loadData();
    } catch (error) {
      console.error('Error al procesar venta:', error);
      console.error('Respuesta del servidor:', error.response?.data);
      toast.error(error.response?.data?.message || 'Error al procesar venta');
    } finally {
      setProcesando(false);
    }
  };

  const abrirDetalleVenta = (ventaId) => {
    setVentaSeleccionada(ventaId);
    setShowDetalleModal(true);
  };

  const handleStatusChange = () => {
    loadData();
  };

  const getEstadoBadge = (estado) => {
    const badges = {
      'PENDIENTE': { bg: 'warning', text: 'Pendiente' },
      'COMPLETADA': { bg: 'success', text: 'Completada' },
      'CANCELADA': { bg: 'danger', text: 'Cancelada' }
    };
    return badges[estado] || { bg: 'secondary', text: estado };
  };

  const productosFiltrados = filtroCategoria
    ? productos.filter(p => p.nombre_categoria === filtroCategoria)
    : productos;

  const totalUSD = calcularTotal();
  const totalMoneda = totalUSD * (tasas[monedaSeleccionada] || 1);

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold">
          <i className="bi bi-cart-plus me-2 text-primary"></i>
          Nueva Venta
        </h2>
        <div className="d-flex gap-2">
          <Form.Select
            value={monedaSeleccionada}
            onChange={(e) => setMonedaSeleccionada(e.target.value)}
            style={{ width: '200px' }}
          >
            {monedas.length > 0 ? (
              monedas.map(moneda => (
                <option key={moneda.id_moneda} value={moneda.codigo_moneda}>
                  {moneda.codigo_moneda} ({moneda.simbolo})
                </option>
              ))
            ) : (
              <>
                <option value="USD">USD ($)</option>
                <option value="VES">VES (Bs.)</option>
                <option value="COP">COP ($)</option>
              </>
            )}
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
                              {formatCurrency(parseFloat(producto.precio_base), 'USD')}
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

          {/* Ventas Recientes */}
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-white">
              <h5 className="mb-0">
                <i className="bi bi-clock-history me-2"></i>
                Ventas Recientes
              </h5>
            </Card.Header>
            <Card.Body>
              <div className="table-responsive">
                <Table hover>
                  <thead className="table-light">
                    <tr>
                      <th>#</th>
                      <th>Fecha</th>
                      <th>Total</th>
                      <th>Moneda</th>
                      <th>Estado</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ventasRecientes.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="text-center text-muted py-4">
                          No hay ventas recientes
                        </td>
                      </tr>
                    ) : (
                      ventasRecientes.map(venta => (
                        <tr key={venta.id_venta}>
                          <td>{venta.id_venta}</td>
                          <td>{formatDateTime(venta.fecha_venta)}</td>
                          <td className="fw-bold">
                            {formatCurrency(parseFloat(venta.monto_total), venta.codigo_moneda)}
                          </td>
                          <td>
                            <Badge bg="secondary">{venta.codigo_moneda}</Badge>
                          </td>
                          <td>
                            <Badge bg={getEstadoBadge(venta.estado_venta).bg}>
                              {getEstadoBadge(venta.estado_venta).text}
                            </Badge>
                          </td>
                          <td>
                            <Button
                              variant="outline-primary"
                              size="sm"
                              onClick={() => abrirDetalleVenta(venta.id_venta)}
                            >
                              <i className="bi bi-eye me-1"></i>
                              Ver
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </Table>
              </div>
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
                              {topping.nombre} (+{formatCurrency(topping.precio, 'USD')})
                              <i
                                className="bi bi-x ms-1"
                                style={{ cursor: 'pointer' }}
                                onClick={() => removerTopping(item.id, topping.id_topping)}
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
                            agregarTopping(item.id, topping);
                            e.target.value = '';
                          }
                        }}
                      >
                        <option value="">+ Agregar topping</option>
                        {toppings.map(topping => (
                          <option key={topping.id_topping} value={topping.id_topping}>
                            {topping.nombre_topping} (+{formatCurrency(parseFloat(topping.precio_adicional), 'USD')})
                          </option>
                        ))}
                      </Form.Select>

                      {/* Cantidad */}
                      <div className="d-flex align-items-center gap-2 mt-2">
                        <Button
                          variant="outline-secondary"
                          size="sm"
                          onClick={() => actualizarCantidad(item.id, item.cantidad - 1)}
                        >
                          <i className="bi bi-dash"></i>
                        </Button>
                        <span className="fw-bold">{item.cantidad}</span>
                        <Button
                          variant="outline-secondary"
                          size="sm"
                          onClick={() => actualizarCantidad(item.id, item.cantidad + 1)}
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

      {/* Modal de Detalle de Venta */}
      <DetalleVentaModal
        show={showDetalleModal}
        onHide={() => setShowDetalleModal(false)}
        ventaId={ventaSeleccionada}
        onStatusChange={handleStatusChange}
      />
    </div>
  );
};

export default NuevaVentaScreen;