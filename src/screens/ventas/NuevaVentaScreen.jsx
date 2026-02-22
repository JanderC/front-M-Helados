import { useState, useEffect } from "react";
import {
  Row,
  Col,
  Card,
  Button,
  Form,
  Badge,
  ListGroup,
  Table,
  InputGroup,
} from "react-bootstrap";
import { productosService } from "../../api/services/productosService";
import { toppingsService } from "../../api/services/toppingsService";
import { saboresService } from "../../api/services/saboresService";
import { siropesService } from "../../api/services/siropesService";
import { ventasService } from "../../api/services/ventasService";
import { monedasService } from "../../api/services/monedasService";
import { clientesService } from "../../api/services/clientesService";
import { toast } from "react-toastify";
import { formatCurrency, formatDateTime } from "../../utils/formatters";
import DetalleVentaModal from "../../components/ventas/DetalleVentaModal";
import { useSocket } from "../../context/SocketContext";

const NuevaVentaScreen = () => {
  const [productos, setProductos] = useState([]);
  const [toppings, setToppings] = useState([]);
  const [sabores, setSabores] = useState([]);
  const [siropes, setSiropes] = useState([]);
  const [tasas, setTasas] = useState({ USD: 1, VES: 36, COP: 4000 });
  const [monedas, setMonedas] = useState([]);
  const [carrito, setCarrito] = useState([]);
  const [monedaSeleccionada, setMonedaSeleccionada] = useState("COP");
  const [loading, setLoading] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [filtroCategoria, setFiltroCategoria] = useState("");
  const [categorias, setCategorias] = useState([]);
  const [ventasRecientes, setVentasRecientes] = useState([]);
  const [showDetalleModal, setShowDetalleModal] = useState(false);
  const [ventaSeleccionada, setVentaSeleccionada] = useState(null);

  // ✅ NUEVO - Control de vuelto
  const [montoRecibido, setMontoRecibido] = useState('');
  const [mostrarVuelto, setMostrarVuelto] = useState(false);

  // Estados para cliente
  const [nombreCliente, setNombreCliente] = useState("");
  const [clientesEncontrados, setClientesEncontrados] = useState([]);
  const [buscandoCliente, setBuscandoCliente] = useState(false);
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false);

  // Hook de Socket
  const { connected, emitirNuevaVenta } = useSocket();

  useEffect(() => {
    loadData();
  }, []);

  // Buscar clientes mientras el usuario escribe
  useEffect(() => {
    const timer = setTimeout(() => {
      if (nombreCliente.length >= 2 && !clienteSeleccionado) {
        buscarClientes(nombreCliente);
      } else {
        setClientesEncontrados([]);
        setMostrarSugerencias(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [nombreCliente, clienteSeleccionado]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [
        prodResponse,
        toppResponse,
        saboresResponse,
        siropesResponse,
        tasasResponse,
        catResponse,
        ventasResponse,
      ] = await Promise.all([
        productosService.getAll(),
        toppingsService.getAll(),
        saboresService.getAll({ disponible: "true" }),
        siropesService.getAll({ disponible: "true" }),
        monedasService.getTasas(),
        productosService.getCategorias(),
        ventasService.getAll({ limit: 10 }),
      ]);

      setProductos(prodResponse.data?.data || prodResponse.data || []);
      setToppings(toppResponse.data?.data || toppResponse.data || []);
      setSabores(saboresResponse.data?.data || saboresResponse.data || []);
      setSiropes(siropesResponse.data?.data || siropesResponse.data || []);

      const monedasData = tasasResponse.data?.data || tasasResponse.data;
      if (Array.isArray(monedasData)) {
        setMonedas(monedasData);
        const tasasObj = {};
        monedasData.forEach((m) => {
          tasasObj[m.codigo_moneda] = parseFloat(m.tasa_cambio_usd);
        });
        setTasas(tasasObj);
      } else {
        setTasas(monedasData || { USD: 1, VES: 36, COP: 4000 });
      }

      setCategorias(catResponse.data?.data || catResponse.data || []);
      setVentasRecientes(ventasResponse.data?.data || ventasResponse.data || []);
      
      console.log('✅ Datos cargados:', {
        productos: prodResponse.data?.data?.length || 0,
        toppings: toppResponse.data?.data?.length || 0,
        sabores: saboresResponse.data?.data?.length || 0,
        siropes: siropesResponse.data?.data?.length || 0
      });
    } catch (error) {
      console.error("Error al cargar datos:", error);
      toast.error("Error al cargar datos");
    } finally {
      setLoading(false);
    }
  };

  const buscarClientes = async (termino) => {
    try {
      setBuscandoCliente(true);
      const response = await clientesService.search(termino);
      const clientes = response.data?.data || response.data || [];
      setClientesEncontrados(clientes);
      setMostrarSugerencias(clientes.length > 0);
    } catch (error) {
      console.error("Error al buscar clientes:", error);
    } finally {
      setBuscandoCliente(false);
    }
  };

  const seleccionarCliente = (cliente) => {
    setClienteSeleccionado(cliente);
    setNombreCliente(cliente.nombre_cliente);
    setClientesEncontrados([]);
    setMostrarSugerencias(false);
  };

  const limpiarCliente = () => {
    setClienteSeleccionado(null);
    setNombreCliente("");
    setClientesEncontrados([]);
    setMostrarSugerencias(false);
  };

  const agregarAlCarrito = (producto) => {
    if (!producto.disponible) {
      toast.error("Producto no disponible");
      return;
    }

    const itemExistente = carrito.find(
      (item) =>
        item.id_producto === producto.id_producto &&
        item.toppings.length === 0 &&
        item.sabores.length === 0 &&
        item.siropes.length === 0
    );

    if (itemExistente) {
      setCarrito(
        carrito.map((item) =>
          item.id === itemExistente.id
            ? { ...item, cantidad: item.cantidad + 1 }
            : item
        )
      );
    } else {
      setCarrito([
        ...carrito,
        {
          id: Date.now(),
          id_producto: producto.id_producto,
          nombre: producto.nombre_producto,
          precio_cop: parseFloat(producto.precio_base),
          precio_usd: parseFloat(producto.precio_usd || 0),
          cantidad: 1,
          toppings: [],
          sabores: [],
          siropes: [],
          imagenUrl: producto.imagen_url,
        },
      ]);
    }
  };

  const agregarTopping = (itemId, topping) => {
    setCarrito(
      carrito.map((item) => {
        if (item.id === itemId) {
          const toppingYaAgregado = item.toppings.find(
            (t) => t.id_topping === topping.id_topping
          );
          if (toppingYaAgregado) {
            toast.warning("Este topping ya fue agregado");
            return item;
          }
          return {
            ...item,
            toppings: [
              ...item.toppings,
              {
                id_topping: topping.id_topping,
                nombre: topping.nombre_topping,
                precio_cop: parseFloat(topping.precio_adicional_cop || 0),
                precio_usd: parseFloat(topping.precio_adicional_usd || 0),
              },
            ],
          };
        }
        return item;
      })
    );
  };

  const agregarSabor = (itemId, sabor) => {
    setCarrito(
      carrito.map((item) => {
        if (item.id === itemId) {
          const saborYaAgregado = item.sabores.find(
            (s) => s.id_sabor === sabor.id_sabor
          );
          if (saborYaAgregado) {
            toast.warning("Este sabor ya fue agregado");
            return item;
          }
          return {
            ...item,
            sabores: [
              ...item.sabores,
              {
                id_sabor: sabor.id_sabor,
                nombre: sabor.nombre_sabor,
                precio_cop: parseFloat(sabor.precio_adicional_cop || sabor.precio_adicional || 0),
                precio_usd: parseFloat(sabor.precio_adicional_usd || 0),
              },
            ],
          };
        }
        return item;
      })
    );
  };

  // 🔥 CORREGIDO - agregarSirope
  const agregarSirope = (itemId, sirope) => {
    setCarrito(
      carrito.map((item) => {
        if (item.id === itemId) {
          const siropeYaAgregado = item.siropes.find(
            (s) => s.id_sirope === sirope.id_sirope
          );
          if (siropeYaAgregado) {
            toast.warning("Este sirope ya fue agregado");
            return item;
          }
          return {
            ...item,
            siropes: [
              ...item.siropes,
              {
                id_sirope: sirope.id_sirope,
                nombre: sirope.nombre_sirope,
                precio_cop: parseFloat(sirope.precio_adicional_cop || 0),
                precio_usd: parseFloat(sirope.precio_adicional_usd || 0),
              },
            ],
          };
        }
        return item;
      })
    );
  };

  const removerTopping = (itemId, toppingId) => {
    setCarrito(
      carrito.map((item) => {
        if (item.id === itemId) {
          return {
            ...item,
            toppings: item.toppings.filter((t) => t.id_topping !== toppingId),
          };
        }
        return item;
      })
    );
  };

  const removerSabor = (itemId, saborId) => {
    setCarrito(
      carrito.map((item) => {
        if (item.id === itemId) {
          return {
            ...item,
            sabores: item.sabores.filter((s) => s.id_sabor !== saborId),
          };
        }
        return item;
      })
    );
  };

  const removerSirope = (itemId, siropeId) => {
    setCarrito(
      carrito.map((item) => {
        if (item.id === itemId) {
          return {
            ...item,
            siropes: item.siropes.filter((s) => s.id_sirope !== siropeId),
          };
        }
        return item;
      })
    );
  };

  const actualizarCantidad = (itemId, nuevaCantidad) => {
    if (nuevaCantidad < 1) return;
    setCarrito(
      carrito.map((item) =>
        item.id === itemId ? { ...item, cantidad: nuevaCantidad } : item
      )
    );
  };

  const removerDelCarrito = (itemId) => {
    setCarrito(carrito.filter((item) => item.id !== itemId));
  };

  // 🔥 CORREGIDO - calcularSubtotal
  const calcularSubtotal = (item) => {
    let precioBase, precioToppings, precioSabores, precioSiropes;

    if (monedaSeleccionada === "COP") {
      precioBase = item.precio_cop;
      precioToppings = item.toppings.reduce((sum, t) => sum + t.precio_cop, 0);
      precioSabores = item.sabores.reduce((sum, s) => sum + s.precio_cop, 0);
      precioSiropes = item.siropes.reduce((sum, s) => sum + s.precio_cop, 0);
    } else if (monedaSeleccionada === "USD") {
      precioBase = item.precio_usd;
      precioToppings = item.toppings.reduce((sum, t) => sum + t.precio_usd, 0);
      precioSabores = item.sabores.reduce((sum, s) => sum + s.precio_usd, 0);
      precioSiropes = item.siropes.reduce((sum, s) => sum + s.precio_usd, 0);
    } else {
      // VES = USD × tasa BCV
      precioBase = item.precio_usd * tasas["VES"];
      precioToppings = item.toppings.reduce(
        (sum, t) => sum + t.precio_usd * tasas["VES"],
        0
      );
      precioSabores = item.sabores.reduce(
        (sum, s) => sum + s.precio_usd * tasas["VES"],
        0
      );
      precioSiropes = item.siropes.reduce(
        (sum, s) => sum + s.precio_usd * tasas["VES"],
        0
      );
    }

    return (
      (precioBase + precioToppings + precioSabores + precioSiropes) *
      item.cantidad
    );
  };

  // 🔥 CORREGIDO - totalCOP
  const totalCOP = carrito.reduce((total, item) => {
    const precioBase = item.precio_cop;
    const precioToppings = item.toppings.reduce((sum, t) => sum + t.precio_cop, 0);
    const precioSabores = item.sabores.reduce((sum, s) => sum + s.precio_cop, 0);
    const precioSiropes = item.siropes.reduce((sum, s) => sum + s.precio_cop, 0);
    return (
      total +
      (precioBase + precioToppings + precioSabores + precioSiropes) * item.cantidad
    );
  }, 0);

  // 🔥 CORREGIDO - totalUSD
  const totalUSD = carrito.reduce((total, item) => {
    const precioBase = item.precio_usd;
    const precioToppings = item.toppings.reduce((sum, t) => sum + t.precio_usd, 0);
    const precioSabores = item.sabores.reduce((sum, s) => sum + s.precio_usd, 0);
    const precioSiropes = item.siropes.reduce((sum, s) => sum + s.precio_usd, 0);
    return (
      total +
      (precioBase + precioToppings + precioSabores + precioSiropes) * item.cantidad
    );
  }, 0);

  // Calcular total en la moneda seleccionada
  const totalMoneda =
    monedaSeleccionada === "COP"
      ? totalCOP
      : monedaSeleccionada === "USD"
      ? totalUSD
      : totalUSD * (tasas["VES"] || 1);

  // 🔥 CORREGIDO - Función helper para obtener precio según moneda
  const getPrecioItem = (item, campo_cop, campo_usd) => {
    if (monedaSeleccionada === "COP") {
      return item[campo_cop] || 0;
    } else if (monedaSeleccionada === "USD") {
      return item[campo_usd] || 0;
    } else {
      return (item[campo_usd] || 0) * tasas["VES"];
    }
  };

  const procesarVenta = async () => {
    if (carrito.length === 0) {
      toast.warning("El carrito está vacío");
      return;
    }

    try {
      setProcesando(true);

      const monedaObj = monedas.find((m) => m.codigo_moneda === monedaSeleccionada);
      if (!monedaObj) {
        toast.error("Error al obtener información de moneda");
        return;
      }

      // 🔥 CORREGIDO - Construcción de detalles con precios correctos
      const detalles = carrito.map((item) => {
        const precioProducto = getPrecioItem(item, 'precio_cop', 'precio_usd');

        return {
          id_producto: item.id_producto,
          cantidad: item.cantidad,
          precio_unitario: precioProducto,
          toppings: item.toppings.map((t) => ({
            id_topping: t.id_topping,
            cantidad: item.cantidad,
            precio_unitario: getPrecioItem(t, 'precio_cop', 'precio_usd'),
          })),
          sabores: item.sabores.map((s) => ({
            id_sabor: s.id_sabor,
            cantidad: item.cantidad,
            precio_unitario: getPrecioItem(s, 'precio_cop', 'precio_usd'),
          })),
          siropes: item.siropes.map((s) => ({
            id_sirope: s.id_sirope,
            cantidad: item.cantidad,
            precio_unitario: getPrecioItem(s, 'precio_cop', 'precio_usd'),
          })),
        };
      });

      const ventaData = {
        nombre_cliente: nombreCliente.trim() || null,
        id_cliente: clienteSeleccionado?.id_cliente || null,
        id_moneda: monedaObj.id_moneda,
        monto_total: totalMoneda,
        productos: detalles,
      };

      console.log('📤 Enviando venta:', {
        moneda: monedaSeleccionada,
        total: totalMoneda,
        productos: detalles.length,
        siropes_totales: detalles.reduce((sum, d) => sum + d.siropes.length, 0)
      });

      const response = await ventasService.create(ventaData);

      toast.success("Venta procesada correctamente");

      // Emitir evento de socket
      if (connected && response.data?.data) {
        const ventaCreada = response.data.data;
        emitirNuevaVenta({
          id_venta: ventaCreada.id_venta,
          numero_factura: ventaCreada.numero_factura,
          nombre_cliente: ventaCreada.nombre_cliente || "Cliente General",
          total: ventaCreada.total,
          codigo_moneda: ventaCreada.codigo_moneda || monedaSeleccionada,
          estado_venta: "PENDIENTE",
          fecha_venta: new Date(),
          cantidad_items: carrito.length,
        });

        console.log("✅ Evento de nueva venta emitido via socket");
      }

      // Abrir modal con la venta recién creada
      const ventaCreada = response.data?.data;
      if (ventaCreada && ventaCreada.id_venta) {
        setVentaSeleccionada(ventaCreada.id_venta);
        setShowDetalleModal(true);
      }

      // Limpiar carrito y recargar datos
      setCarrito([]);
      limpiarCliente();
      setMontoRecibido('');
      setMostrarVuelto(false);
      loadData();
    } catch (error) {
      console.error("Error al procesar venta:", error);
      toast.error(error.response?.data?.message || "Error al procesar venta");
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

  const productosFiltrados = productos.filter((p) => {
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
          <Badge bg={connected ? "success" : "danger"} className="me-2">
            {connected ? "🟢 Conectado" : "🔴 Desconectado"}
          </Badge>

          <Form.Select
            value={monedaSeleccionada}
            onChange={(e) => setMonedaSeleccionada(e.target.value)}
            style={{ width: "auto" }}
          >
            <option value="COP">Pesos (COP)</option>
            <option value="VES">Bolívares (VES)</option>
            <option value="USD">Dólares (USD)</option>
          </Form.Select>
          {tasas[monedaSeleccionada] && monedaSeleccionada !== "USD" && (
            <Badge bg="info">
              Tasa: {tasas[monedaSeleccionada].toFixed(2)}
            </Badge>
          )}
        </div>
      </div>

      <Row>
        <Col lg={8}>
          <Card className="border-0 shadow-sm mb-4">
            <Card.Body>
              <Row>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Filtrar por Categoría</Form.Label>
                    <Form.Select
                      value={filtroCategoria}
                      onChange={(e) => setFiltroCategoria(e.target.value)}
                    >
                      <option value="">Todas las categorías</option>
                      {categorias.map((cat) => (
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

          <Row>
            {productosFiltrados.map((producto) => (
              <Col key={producto.id_producto} md={6} lg={4} className="mb-3">
                <Card
                  className="h-100 border-0 shadow-sm"
                  style={{ cursor: "pointer" }}
                  onClick={() => agregarAlCarrito(producto)}
                >
                  {producto.imagen_url && (
                    <Card.Img
                      variant="top"
                      src={producto.imagen_url}
                      alt={producto.nombre_producto}
                      style={{ height: "150px", objectFit: "cover" }}
                    />
                  )}
                  <Card.Body>
                    <Card.Title className="small">
                      {producto.nombre_producto}
                    </Card.Title>
                    <div className="d-flex justify-content-between align-items-center">
                      <h5 className="mb-0 text-primary">
                        {monedaSeleccionada === "COP"
                          ? formatCurrency(producto.precio_base, "COP")
                          : monedaSeleccionada === "USD"
                          ? formatCurrency(producto.precio_usd, "USD")
                          : formatCurrency(
                              producto.precio_usd * tasas["VES"],
                              "VES"
                            )}
                      </h5>
                      <Button variant="primary" size="sm">
                        <i className="bi bi-plus"></i>
                      </Button>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>

          <Card className="border-0 shadow-sm mt-4">
            <Card.Header className="bg-white">
              <h5 className="mb-0">
                <i className="bi bi-clock-history me-2"></i>
                Ventas Recientes
              </h5>
            </Card.Header>
            <Card.Body>
              <Table hover responsive>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Cliente</th>
                    <th>Moneda</th>
                    <th>Total</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {ventasRecientes.map((venta) => (
                    <tr key={venta.id_venta}>
                      <td className="small">
                        {formatDateTime(venta.fecha_venta)}
                      </td>
                      <td>{venta.nombre_cliente || "-"}</td>
                      <td>
                        <Badge bg="secondary">{venta.codigo_moneda}</Badge>
                      </td>
                      <td className="fw-bold">
                        {formatCurrency(venta.total, venta.codigo_moneda)}
                      </td>
                      <td>
                        <Badge
                          bg={
                            venta.estado_venta === "COMPLETADA"
                              ? "success"
                              : venta.estado_venta === "EN_PROCESO"
                              ? "warning"
                              : venta.estado_venta === "PENDIENTE"
                              ? "info"
                              : "secondary"
                          }
                        >
                          {venta.estado_venta}
                        </Badge>
                      </td>
                      <td>
                        <Button
                          variant="outline-primary"
                          size="sm"
                          onClick={() => handleVerDetalle(venta.id_venta)}
                        >
                          <i className="bi bi-eye"></i>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={4}>
          <Card
            className="border-0 shadow-sm sticky-top"
            style={{ top: "20px" }}
          >
            <Card.Header className="bg-primary text-white">
              <h5 className="mb-0">
                <i className="bi bi-cart3 me-2"></i>
                Carrito ({carrito.length})
              </h5>
            </Card.Header>
            <Card.Body style={{ maxHeight: "500px", overflowY: "auto" }}>
              <div className="mb-3">
                <Form.Label className="fw-bold">
                  <i className="bi bi-person me-2"></i>
                  Cliente
                </Form.Label>
                <InputGroup>
                  <Form.Control
                    type="text"
                    placeholder="Nombre del cliente..."
                    value={nombreCliente}
                    onChange={(e) => {
                      setNombreCliente(e.target.value);
                      if (clienteSeleccionado) {
                        setClienteSeleccionado(null);
                      }
                    }}
                    onFocus={() => {
                      if (clientesEncontrados.length > 0) {
                        setMostrarSugerencias(true);
                      }
                    }}
                  />
                  {clienteSeleccionado && (
                    <Button
                      variant="outline-secondary"
                      onClick={limpiarCliente}
                    >
                      <i className="bi bi-x"></i>
                    </Button>
                  )}
                </InputGroup>
                {clienteSeleccionado && (
                  <div className="mt-2">
                    <Badge bg="success">
                      <i className="bi bi-check-circle me-1"></i>
                      Cliente registrado
                    </Badge>
                  </div>
                )}
                {mostrarSugerencias && clientesEncontrados.length > 0 && (
                  <ListGroup
                    className="position-absolute"
                    style={{ zIndex: 1000, width: "calc(100% - 30px)" }}
                  >
                    {clientesEncontrados.map((cliente) => (
                      <ListGroup.Item
                        key={cliente.id_cliente}
                        action
                        onClick={() => seleccionarCliente(cliente)}
                        className="cursor-pointer"
                      >
                        <div className="d-flex justify-content-between">
                          <div>
                            <strong>{cliente.nombre_cliente}</strong>
                            {cliente.telefono && (
                              <div className="small text-muted">
                                {cliente.telefono}
                              </div>
                            )}
                          </div>
                          {cliente.email && (
                            <small className="text-muted">
                              {cliente.email}
                            </small>
                          )}
                        </div>
                      </ListGroup.Item>
                    ))}
                  </ListGroup>
                )}
              </div>

              <hr />

              {carrito.length === 0 ? (
                <div className="text-center py-5 text-muted">
                  <i className="bi bi-cart-x" style={{ fontSize: "3rem" }}></i>
                  <p className="mt-2">El carrito está vacío</p>
                </div>
              ) : (
                <ListGroup variant="flush">
                  {carrito.map((item) => (
                    <ListGroup.Item key={item.id} className="px-0">
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <div className="flex-grow-1">
                          <strong>{item.nombre}</strong>
                          <div className="small text-muted">
                            {formatCurrency(
                              getPrecioItem(item, 'precio_cop', 'precio_usd'),
                              monedaSeleccionada
                            )}{" "}
                            x {item.cantidad}
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
                          {item.sabores.map((sabor) => {
                            const precioSabor = getPrecioItem(sabor, 'precio_cop', 'precio_usd');
                            return (
                              <Badge
                                key={sabor.id_sabor}
                                bg="info"
                                className="me-1 mb-1"
                              >
                                {sabor.nombre}
                                {precioSabor > 0 &&
                                  ` (+${formatCurrency(precioSabor, monedaSeleccionada)})`}
                                <i
                                  className="bi bi-x ms-1"
                                  style={{ cursor: "pointer" }}
                                  onClick={() => removerSabor(item.id, sabor.id_sabor)}
                                ></i>
                              </Badge>
                            );
                          })}
                        </div>
                      )}

                      {/* Toppings agregados */}
                      {item.toppings.length > 0 && (
                        <div className="mb-2">
                          <small className="text-muted d-block mb-1">
                            <i className="bi bi-stars me-1"></i>
                            Toppings:
                          </small>
                          {item.toppings.map((topping) => (
                            <Badge
                              key={topping.id_topping}
                              bg="secondary"
                              className="me-1 mb-1"
                            >
                              {topping.nombre} (+
                              {formatCurrency(
                                getPrecioItem(topping, 'precio_cop', 'precio_usd'),
                                monedaSeleccionada
                              )}
                              )
                              <i
                                className="bi bi-x ms-1"
                                style={{ cursor: "pointer" }}
                                onClick={() => removerTopping(item.id, topping.id_topping)}
                              ></i>
                            </Badge>
                          ))}
                        </div>
                      )}

                      {/* 🔥 Siropes agregados */}
                      {item.siropes.length > 0 && (
                        <div className="mb-2">
                          <small className="text-muted d-block mb-1">
                            <i className="bi bi-droplet-fill me-1"></i>
                            Siropes:
                          </small>
                          {item.siropes.map((sirope) => (
                            <Badge
                              key={sirope.id_sirope}
                              bg="warning"
                              text="dark"
                              className="me-1 mb-1"
                            >
                              {sirope.nombre} (+
                              {formatCurrency(
                                getPrecioItem(sirope, 'precio_cop', 'precio_usd'),
                                monedaSeleccionada
                              )}
                              )
                              <i
                                className="bi bi-x ms-1"
                                style={{ cursor: "pointer" }}
                                onClick={() => removerSirope(item.id, sirope.id_sirope)}
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
                          const sabor = sabores.find(
                            (s) => s.id_sabor === parseInt(e.target.value)
                          );
                          if (sabor) {
                            agregarSabor(item.id, sabor);
                            e.target.value = "";
                          }
                        }}
                      >
                        <option value="">+ Agregar sabor</option>
                        {sabores.map((sabor) => {
                          const precioSabor = monedaSeleccionada === "COP"
                            ? parseFloat(sabor.precio_adicional_cop || sabor.precio_adicional || 0)
                            : monedaSeleccionada === "USD"
                            ? parseFloat(sabor.precio_adicional_usd || 0)
                            : parseFloat(sabor.precio_adicional_usd || 0) * tasas["VES"];
                          
                          return (
                            <option key={sabor.id_sabor} value={sabor.id_sabor}>
                              {sabor.nombre_sabor}
                              {precioSabor > 0 &&
                                ` (+${formatCurrency(precioSabor, monedaSeleccionada)})`}
                            </option>
                          );
                        })}
                      </Form.Select>

                      {/* Selector de toppings */}
                      <Form.Select
                        size="sm"
                        className="mb-2"
                        onChange={(e) => {
                          const topping = toppings.find(
                            (t) => t.id_topping === parseInt(e.target.value)
                          );
                          if (topping) {
                            agregarTopping(item.id, topping);
                            e.target.value = "";
                          }
                        }}
                      >
                        <option value="">+ Agregar topping</option>
                        {toppings.map((topping) => {
                          const precioTopping = monedaSeleccionada === "COP"
                            ? parseFloat(topping.precio_adicional_cop)
                            : monedaSeleccionada === "USD"
                            ? parseFloat(topping.precio_adicional_usd)
                            : parseFloat(topping.precio_adicional_usd) * tasas["VES"];
                          
                          return (
                            <option
                              key={topping.id_topping}
                              value={topping.id_topping}
                            >
                              {topping.nombre_topping} (+
                              {formatCurrency(precioTopping, monedaSeleccionada)}
                              )
                            </option>
                          );
                        })}
                      </Form.Select>

                      {/* 🔥 Selector de siropes */}
                      <Form.Select
                        size="sm"
                        className="mb-2"
                        onChange={(e) => {
                          const sirope = siropes.find(
                            (s) => s.id_sirope === parseInt(e.target.value)
                          );
                          if (sirope) {
                            agregarSirope(item.id, sirope);
                            e.target.value = "";
                          }
                        }}
                      >
                        <option value="">+ Agregar sirope</option>
                        {siropes.map((sirope) => {
                          const precioSirope = monedaSeleccionada === "COP"
                            ? parseFloat(sirope.precio_adicional_cop)
                            : monedaSeleccionada === "USD"
                            ? parseFloat(sirope.precio_adicional_usd)
                            : parseFloat(sirope.precio_adicional_usd) * tasas["VES"];
                          
                          return (
                            <option
                              key={sirope.id_sirope}
                              value={sirope.id_sirope}
                            >
                              {sirope.nombre_sirope} (+
                              {formatCurrency(precioSirope, monedaSeleccionada)}
                              )
                            </option>
                          );
                        })}
                      </Form.Select>

                      {/* Cantidad */}
                      <div className="d-flex align-items-center gap-2 mt-2">
                        <Button
                          variant="outline-secondary"
                          size="sm"
                          onClick={() =>
                            actualizarCantidad(item.id, item.cantidad - 1)
                          }
                        >
                          <i className="bi bi-dash"></i>
                        </Button>
                        <span className="fw-bold">{item.cantidad}</span>
                        <Button
                          variant="outline-secondary"
                          size="sm"
                          onClick={() =>
                            actualizarCantidad(item.id, item.cantidad + 1)
                          }
                        >
                          <i className="bi bi-plus"></i>
                        </Button>
                        <div className="ms-auto fw-bold">
                          {formatCurrency(
                            calcularSubtotal(item),
                            monedaSeleccionada
                          )}
                        </div>
                      </div>
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              )}
            </Card.Body>

            {carrito.length > 0 && (
              <Card.Footer className="bg-light">
                {/* Total */}
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <strong>Total {monedaSeleccionada}:</strong>
                  <h4 className="mb-0 text-success fw-bold">
                    {formatCurrency(totalMoneda, monedaSeleccionada)}
                  </h4>
                </div>

                {/* ✅ NUEVO - Control de vuelto */}
                <div className="mb-3">
                  <Form.Label className="fw-bold small">
                    <i className="bi bi-cash me-1"></i>
                    Monto recibido ({monedaSeleccionada})
                  </Form.Label>
                  <Form.Control
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder={`Ej: ${formatCurrency(Math.ceil(totalMoneda / 1000) * 1000, monedaSeleccionada)}`}
                    value={montoRecibido}
                    onChange={(e) => {
                      setMontoRecibido(e.target.value);
                      setMostrarVuelto(parseFloat(e.target.value) >= totalMoneda);
                    }}
                  />
                  {montoRecibido && parseFloat(montoRecibido) < totalMoneda && (
                    <div className="text-danger small mt-1">
                      <i className="bi bi-exclamation-circle me-1"></i>
                      Monto insuficiente. Faltan{' '}
                      <strong>
                        {formatCurrency(totalMoneda - parseFloat(montoRecibido), monedaSeleccionada)}
                      </strong>
                    </div>
                  )}
                  {mostrarVuelto && parseFloat(montoRecibido) > 0 && (
                    <div
                      className="mt-2 p-2 rounded d-flex justify-content-between align-items-center"
                      style={{ background: 'rgba(40,167,69,0.1)', border: '1px solid rgba(40,167,69,0.3)' }}
                    >
                      <span className="fw-bold text-success">
                        <i className="bi bi-arrow-return-left me-1"></i>
                        Vuelto:
                      </span>
                      <strong className="text-success fs-5">
                        {formatCurrency(
                          Math.max(0, parseFloat(montoRecibido) - totalMoneda),
                          monedaSeleccionada
                        )}
                      </strong>
                    </div>
                  )}
                </div>

                {/* ✅ Botón procesar venta */}
                <Button
                  variant="success"
                  className="w-100"
                  size="lg"
                  onClick={procesarVenta}
                  disabled={procesando}
                >
                  {procesando ? (
                    <>
                      <span
                        className="spinner-border spinner-border-sm me-2"
                        role="status"
                        aria-hidden="true"
                      ></span>
                      Procesando...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-send me-2"></i>
                      Procesar Venta y Enviar Pedido
                    </>
                  )}
                </Button>
              </Card.Footer>
            )}
          </Card>
        </Col>
      </Row>

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