import { useState, useEffect } from 'react';
import { Row, Col, Card, Button, Form, Badge, ListGroup, Table, InputGroup } from 'react-bootstrap';
import { productosService } from '../../api/services/productosService';
import { toppingsService } from '../../api/services/toppingsService';
import { saboresService } from '../../api/services/saboresService';
import { ventasService } from '../../api/services/ventasService';
import { monedasService } from '../../api/services/monedasService';
import { metodosPagoService } from '../../api/services/metodosPagoService';
import { toast } from 'react-toastify';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import DetalleVentaModal from '../../components/ventas/DetalleVentaModal';

// ✅ NUEVO: línea de pago vacía. Con una sola línea, moneda/monto se
// autocompletan con la moneda y el total de la venta; con varias, el
// usuario los edita a mano (pago dividido).
const pagoVacio = (moneda, monto = '') => ({
  id: Date.now() + Math.random(),
  id_metodo_pago: '',
  moneda,
  monto
});

const NuevaVentaScreen = () => {
  const [productos, setProductos] = useState([]);
  const [toppings, setToppings] = useState([]);
  const [sabores, setSabores] = useState([]);
  const [tasas, setTasas] = useState({ USD: 1, VES: 36, COP: 4000 });
  const [monedas, setMonedas] = useState([]);
  const [carrito, setCarrito] = useState([]);
  const [monedaSeleccionada, setMonedaSeleccionada] = useState('COP');
  const [loading, setLoading] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [categorias, setCategorias] = useState([]);
  const [ventasRecientes, setVentasRecientes] = useState([]);
  const [showDetalleModal, setShowDetalleModal] = useState(false);
  const [ventaSeleccionada, setVentaSeleccionada] = useState(null);

  // Estado simple para nombre del cliente
  const [nombreCliente, setNombreCliente] = useState('');

  // ✅ NUEVO: métodos de pago
  const [metodosPago, setMetodosPago] = useState([]);
  const [pagos, setPagos] = useState([pagoVacio('COP')]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [prodResponse, toppResponse, saboresResponse, tasasResponse, catResponse, ventasResponse, metodosPagoResponse] = await Promise.all([
        productosService.getAll(),
        toppingsService.getAll(),
        saboresService.getAll({ disponible: 'true' }),
        monedasService.getTasas(),
        productosService.getCategorias(),
        ventasService.getAll({ limit: 10 }),
        metodosPagoService.getAll({ activo: 'true' }) // ✅ NUEVO
      ]);
      
      setProductos(prodResponse.data?.data || prodResponse.data || []);
      setToppings(toppResponse.data?.data || toppResponse.data || []);
      setSabores(saboresResponse.data?.data || saboresResponse.data || []);
      
      const monedasData = tasasResponse.data?.data || tasasResponse.data;
      if (Array.isArray(monedasData)) {
        setMonedas(monedasData);
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
      setMetodosPago(metodosPagoResponse.data?.data || metodosPagoResponse.data || []); // ✅ NUEVO
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
      item.id_producto === producto.id_producto && 
      item.toppings.length === 0 && 
      item.sabores.length === 0
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
        precio_cop: parseFloat(producto.precio_base),
        precio_usd: parseFloat(producto.precio_usd || 0),
        cantidad: 1,
        toppings: [],
        sabores: [],
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

  const agregarSabor = (itemId, sabor) => {
    setCarrito(carrito.map(item => {
      if (item.id === itemId) {
        const saborYaAgregado = item.sabores.find(s => s.id_sabor === sabor.id_sabor);
        if (saborYaAgregado) {
          toast.warning('Este sabor ya fue agregado');
          return item;
        }
        return {
          ...item,
          sabores: [...item.sabores, {
            id_sabor: sabor.id_sabor,
            nombre: sabor.nombre_sabor,
            precio: parseFloat(sabor.precio_adicional || 0)
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

  const removerSabor = (itemId, saborId) => {
    setCarrito(carrito.map(item => {
      if (item.id === itemId) {
        return {
          ...item,
          sabores: item.sabores.filter(s => s.id_sabor !== saborId)
        };
      }
      return item;
    }));
  };

  const actualizarCantidad = (itemId, nuevaCantidad) => {
    if (nuevaCantidad < 1) return;
    setCarrito(carrito.map(item =>
      item.id === itemId ? { ...item, cantidad: nuevaCantidad } : item
    ));
  };

  const removerDelCarrito = (itemId) => {
    setCarrito(carrito.filter(item => item.id !== itemId));
  };

  const calcularSubtotal = (item) => {
    const precioBase = monedaSeleccionada === 'COP' ? item.precio_cop : item.precio_usd;
    const precioToppings = item.toppings.reduce((sum, t) => sum + t.precio, 0);
    const precioSabores = item.sabores.reduce((sum, s) => sum + s.precio, 0);
    return (precioBase + precioToppings + precioSabores) * item.cantidad;
  };

  // Calcular total en COP
  const totalCOP = carrito.reduce((total, item) => {
    const precioBase = item.precio_cop;
    const precioToppings = item.toppings.reduce((sum, t) => sum + t.precio, 0);
    const precioSabores = item.sabores.reduce((sum, s) => sum + s.precio, 0);
    return total + ((precioBase + precioToppings + precioSabores) * item.cantidad);
  }, 0);

  // Calcular total en USD (para conversión a VES)
  const totalUSD = carrito.reduce((total, item) => {
    const precioBase = item.precio_usd;
    const precioToppings = item.toppings.reduce((sum, t) => sum + t.precio, 0);
    const precioSabores = item.sabores.reduce((sum, s) => sum + s.precio, 0);
    return total + ((precioBase + precioToppings + precioSabores) * item.cantidad);
  }, 0);

  // Calcular total en la moneda seleccionada
  const totalMoneda = monedaSeleccionada === 'COP' 
    ? totalCOP 
    : monedaSeleccionada === 'USD'
    ? totalUSD
    : totalUSD * (tasas['VES'] || 1);

  // ✅ NUEVO: mientras solo haya una línea de pago, se sincroniza sola con
  // la moneda y el total de la venta. Si el usuario agrega más líneas
  // (pago dividido), deja de autocompletarse y las edita a mano.
  useEffect(() => {
    if (pagos.length === 1) {
      setPagos([{
        ...pagos[0],
        moneda: monedaSeleccionada,
        monto: totalMoneda ? totalMoneda.toFixed(2) : ''
      }]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monedaSeleccionada, totalMoneda]);

  const agregarLineaPago = () => {
    setPagos([...pagos, pagoVacio(monedaSeleccionada)]);
  };

  const quitarLineaPago = (id) => {
    setPagos(pagos.filter(p => p.id !== id));
  };

  const actualizarLineaPago = (id, campo, valor) => {
    setPagos(pagos.map(p => (p.id === id ? { ...p, [campo]: valor } : p)));
  };

  // ✅ NUEVO: total esperado en USD y lo que suman las líneas de pago en USD
  // (cada línea puede estar en una moneda distinta, por eso se convierte)
  const totalVentaUSD = monedaSeleccionada === 'USD'
    ? totalMoneda
    : totalMoneda / (tasas[monedaSeleccionada] || 1);

  const totalPagosUSD = pagos.reduce((sum, p) => {
    const monto = parseFloat(p.monto) || 0;
    const montoUSD = p.moneda === 'USD' ? monto : monto / (tasas[p.moneda] || 1);
    return sum + montoUSD;
  }, 0);

  const toleranciaUSD = Math.max(1, totalVentaUSD * 0.02); // 2% o 1 USD, lo que sea mayor
  const pagosCuadran = pagos.length === 1
    ? true
    : Math.abs(totalPagosUSD - totalVentaUSD) <= toleranciaUSD;
  const pagosCompletos = pagos.every(p => p.id_metodo_pago && parseFloat(p.monto) > 0);

  const procesarVenta = async () => {
    if (carrito.length === 0) {
      toast.warning('El carrito está vacío');
      return;
    }

    if (!pagosCompletos) {
      toast.warning('Selecciona el método de pago y el monto de cada línea');
      return;
    }

    if (!pagosCuadran) {
      toast.warning('La suma de los pagos no coincide con el total de la venta');
      return;
    }

    try {
      setProcesando(true);

      // Obtener id_moneda basado en el código
      const monedaObj = monedas.find(m => m.codigo_moneda === monedaSeleccionada);
      if (!monedaObj) {
        toast.error('Error al obtener información de moneda');
        return;
      }

      const detalles = carrito.map(item => ({
        id_producto: item.id_producto,
        cantidad: item.cantidad,
        precio_unitario: monedaSeleccionada === 'COP' ? item.precio_cop : item.precio_usd,
        toppings: item.toppings.map(t => ({
          id_topping: t.id_topping,
          cantidad: item.cantidad,
          precio_unitario: t.precio
        })),
        sabores: item.sabores.map(s => ({
          id_sabor: s.id_sabor
        }))
      }));

      // ✅ NUEVO: pagos (uno o varios métodos, cada uno con su propia moneda)
      const pagosPayload = pagos.map(p => {
        const monedaDelPago = monedas.find(m => m.codigo_moneda === p.moneda);
        return {
          id_metodo_pago: parseInt(p.id_metodo_pago, 10),
          id_moneda: monedaDelPago?.id_moneda,
          monto: parseFloat(p.monto)
        };
      });

      const ventaData = {
        nombre_cliente: nombreCliente.trim() || null, // ACTUALIZADO: enviar nombre simple
        id_moneda: monedaObj.id_moneda,
        monto_total: totalMoneda,
        productos: detalles,
        pagos: pagosPayload // ✅ NUEVO
      };

      await ventasService.create(ventaData);
      
      toast.success('Venta procesada correctamente');
      setCarrito([]);
      setNombreCliente(''); // Limpiar nombre del cliente
      setPagos([pagoVacio(monedaSeleccionada)]); // ✅ NUEVO: reset de pagos
      loadData();

    } catch (error) {
      console.error('Error al procesar venta:', error);
      toast.error(error.response?.data?.message || 'Error al procesar venta');
    } finally {
      setProcesando(false);
    }
  };

  const handleVerDetalle = (ventaId) => {
    setVentaSeleccionada(ventaId);
    setShowDetalleModal(true);
  };

  const handleStatusChange = () => {
    loadData();
  };

  const productosFiltrados = productos.filter(p => {
    if (filtroCategoria && p.id_categoria !== parseInt(filtroCategoria)) {
      return false;
    }
    return p.disponible;
  });

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Cargando...</span>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold">
          <i className="bi bi-cart-plus me-2 text-primary"></i>
          Nueva Venta
        </h2>
        <div className="d-flex gap-2 align-items-center">
          <Form.Select
            value={monedaSeleccionada}
            onChange={(e) => setMonedaSeleccionada(e.target.value)}
            style={{ width: 'auto' }}
          >
            <option value="COP">Pesos (COP)</option>
            <option value="VES">Bolívares (VES)</option>
            <option value="USD">Dólares (USD)</option>
          </Form.Select>
          {tasas[monedaSeleccionada] && monedaSeleccionada !== 'USD' && (
            <Badge bg="info">
              Tasa: {tasas[monedaSeleccionada].toFixed(2)}
            </Badge>
          )}
        </div>
      </div>

      <Row>
        {/* Columna de Productos */}
        <Col lg={8}>
          {/* Filtro de categorías */}
          <Card className="border-0 shadow-sm mb-4">
            <Card.Body>
              <Row>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Filtrar por Categorías</Form.Label>
                    <Form.Select
                      value={filtroCategoria}
                      onChange={(e) => setFiltroCategoria(e.target.value)}
                    >
                      <option value="">Todas las categorías</option>
                      {categorias.map(cat => (
                        <option key={cat.id_categoria} value={cat.id_categoria}>
                          {cat.nombre_categoria}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
              </Row>
            </Card.Body>
          </Card>

          {/* Grid de productos */}
          <Row xs={2} md={3} lg={3} className="g-3 mb-4">
            {productosFiltrados.map(producto => (
              <Col key={producto.id_producto}>
                <Card
                  className="h-100 border-0 shadow-sm product-card"
                  style={{ cursor: 'pointer' }}
                  onClick={() => agregarAlCarrito(producto)}
                >
                  {producto.imagen_url && (
                    <Card.Img
                      variant="top"
                      src={producto.imagen_url}
                      style={{ height: '120px', objectFit: 'cover' }}
                    />
                  )}
                  <Card.Body className="p-2">
                    <Card.Title className="fs-6 mb-1">{producto.nombre_producto}</Card.Title>
                    <Card.Text className="mb-0">
                      <strong className="text-primary">
                        {monedaSeleccionada === 'COP'
                          ? formatCurrency(producto.precio_base, 'COP')
                          : monedaSeleccionada === 'USD'
                          ? formatCurrency(producto.precio_usd, 'USD')
                          : formatCurrency(producto.precio_usd * (tasas['VES'] || 1), 'VES')}
                      </strong>
                    </Card.Text>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>
        </Col>

        {/* Columna de Carrito */}
        <Col lg={4}>
          <Card className="border-0 shadow-sm sticky-top" style={{ top: '20px' }}>
            <Card.Header className="bg-primary text-white">
              <h5 className="mb-0">
                <i className="bi bi-cart3 me-2"></i>
                Carrito ({carrito.length})
              </h5>
            </Card.Header>
            <Card.Body style={{ maxHeight: '500px', overflowY: 'auto' }}>
              {/* Campo de Cliente SIMPLIFICADO */}
              <div className="mb-3">
                <Form.Label className="fw-bold">
                  <i className="bi bi-person me-2"></i>
                  Cliente (Opcional)
                </Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Nombre del cliente..."
                  value={nombreCliente}
                  onChange={(e) => setNombreCliente(e.target.value)}
                  maxLength={100}
                />
                <Form.Text className="text-muted">
                  Puede dejar este campo vacío
                </Form.Text>
              </div>

              <hr />

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
                            {monedaSeleccionada === 'COP' 
                              ? formatCurrency(item.precio_cop, 'COP')
                              : monedaSeleccionada === 'USD'
                              ? formatCurrency(item.precio_usd, 'USD')
                              : formatCurrency(item.precio_usd * tasas['VES'], 'VES')
                            } x {item.cantidad}
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

                      {/* Sabores agregados */}
                      {item.sabores.length > 0 && (
                        <div className="mb-2">
                          <small className="text-muted d-block mb-1">
                            <i className="bi bi-snow2 me-1"></i>
                            Sabores:
                          </small>
                          {item.sabores.map(sabor => (
                            <Badge
                              key={sabor.id_sabor}
                              bg="info"
                              className="me-1 mb-1"
                            >
                              {sabor.nombre}
                              {sabor.precio > 0 && ` (+${formatCurrency(sabor.precio, monedaSeleccionada)})`}
                              <i
                                className="bi bi-x ms-1"
                                style={{ cursor: 'pointer' }}
                                onClick={() => removerSabor(item.id, sabor.id_sabor)}
                              ></i>
                            </Badge>
                          ))}
                        </div>
                      )}

                      {/* Toppings agregados */}
                      {item.toppings.length > 0 && (
                        <div className="mb-2">
                          <small className="text-muted d-block mb-1">
                            <i className="bi bi-stars me-1"></i>
                            Toppings:
                          </small>
                          {item.toppings.map(topping => (
                            <Badge
                              key={topping.id_topping}
                              bg="secondary"
                              className="me-1 mb-1"
                            >
                              {topping.nombre} (+{formatCurrency(topping.precio, monedaSeleccionada)})
                              <i
                                className="bi bi-x ms-1"
                                style={{ cursor: 'pointer' }}
                                onClick={() => removerTopping(item.id, topping.id_topping)}
                              ></i>
                            </Badge>
                          ))}
                        </div>
                      )}

                      {/* Selector de sabores */}
                      <Form.Select
                        size="sm"
                        className="mb-2"
                        onChange={(e) => {
                          const sabor = sabores.find(s => s.id_sabor === parseInt(e.target.value));
                          if (sabor) {
                            agregarSabor(item.id, sabor);
                            e.target.value = '';
                          }
                        }}
                      >
                        <option value="">+ Agregar sabor</option>
                        {sabores.map(sabor => (
                          <option key={sabor.id_sabor} value={sabor.id_sabor}>
                            {sabor.nombre_sabor}
                            {parseFloat(sabor.precio_adicional) > 0 && ` (+${formatCurrency(parseFloat(sabor.precio_adicional), monedaSeleccionada)})`}
                          </option>
                        ))}
                      </Form.Select>

                      {/* Selector de toppings */}
                      <Form.Select
                        size="sm"
                        className="mb-2"
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
                            {topping.nombre_topping} (+{formatCurrency(parseFloat(topping.precio_adicional), monedaSeleccionada)})
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
                          {formatCurrency(calcularSubtotal(item), monedaSeleccionada)}
                        </div>
                      </div>
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              )}
            </Card.Body>
            
            {carrito.length > 0 && (
              <Card.Footer className="bg-light">
                {/* ✅ NUEVO: Métodos de pago */}
                <div className="mb-3">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <strong>
                      <i className="bi bi-wallet2 me-2"></i>
                      Método{pagos.length > 1 ? 's' : ''} de pago
                    </strong>
                    <Button variant="link" size="sm" className="p-0" onClick={agregarLineaPago}>
                      <i className="bi bi-plus-circle me-1"></i>
                      Dividir pago
                    </Button>
                  </div>

                  {pagos.map((pago) => (
                    <Row key={pago.id} className="g-2 mb-2 align-items-center">
                      <Col xs={pagos.length > 1 ? 5 : 7}>
                        <Form.Select
                          size="sm"
                          value={pago.id_metodo_pago}
                          onChange={(e) => actualizarLineaPago(pago.id, 'id_metodo_pago', e.target.value)}
                        >
                          <option value="">Método...</option>
                          {metodosPago
                            .filter(mp => !mp.id_moneda || mp.codigo_moneda === pago.moneda)
                            .map(mp => (
                              <option key={mp.id_metodo_pago} value={mp.id_metodo_pago}>
                                {mp.nombre}
                              </option>
                            ))}
                        </Form.Select>
                      </Col>
                      {pagos.length > 1 && (
                        <Col xs={3}>
                          <Form.Select
                            size="sm"
                            value={pago.moneda}
                            onChange={(e) => actualizarLineaPago(pago.id, 'moneda', e.target.value)}
                          >
                            <option value="COP">COP</option>
                            <option value="VES">VES</option>
                            <option value="USD">USD</option>
                          </Form.Select>
                        </Col>
                      )}
                      <Col xs={pagos.length > 1 ? 3 : 5}>
                        <Form.Control
                          size="sm"
                          type="number"
                          step="0.01"
                          value={pago.monto}
                          placeholder="Monto"
                          onChange={(e) => actualizarLineaPago(pago.id, 'monto', e.target.value)}
                          disabled={pagos.length === 1}
                        />
                      </Col>
                      {pagos.length > 1 && (
                        <Col xs={1} className="text-end">
                          <Button
                            variant="link"
                            size="sm"
                            className="text-danger p-0"
                            onClick={() => quitarLineaPago(pago.id)}
                          >
                            <i className="bi bi-x-lg"></i>
                          </Button>
                        </Col>
                      )}
                    </Row>
                  ))}

                  {pagos.length > 1 && (
                    <div className={`small mt-1 ${pagosCuadran ? 'text-success' : 'text-danger'}`}>
                      <i className={`bi ${pagosCuadran ? 'bi-check-circle' : 'bi-exclamation-triangle'} me-1`}></i>
                      Pagos: ≈ ${totalPagosUSD.toFixed(2)} USD &nbsp;/&nbsp; Venta: ≈ ${totalVentaUSD.toFixed(2)} USD
                    </div>
                  )}
                </div>

                <div className="d-flex justify-content-between align-items-center mb-3">
                  <strong>Total {monedaSeleccionada}:</strong>
                  <h4 className="mb-0 text-success">
                    {formatCurrency(totalMoneda, monedaSeleccionada)}
                  </h4>
                </div>
                <Button
                  variant="success"
                  className="w-100"
                  size="lg"
                  onClick={procesarVenta}
                  disabled={procesando || !pagosCuadran || !pagosCompletos}
                >
                  {procesando ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Procesando...
                    </>
                  ) : (
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