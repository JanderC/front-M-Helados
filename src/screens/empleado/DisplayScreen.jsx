// DisplayScreen.jsx
import { useState, useEffect } from 'react';
import { Row, Col, Card, Badge, Alert, Modal, Button } from 'react-bootstrap';
import { ventasService } from '../../api/services/ventasService';
import { useSocket } from '../../context/SocketContext';
import { formatDateTime, formatTimeAgo } from '../../utils/formatters';
import './DisplayScreen.css';

const DisplayScreen = () => {
  const [pedidos, setPedidos] = useState([]);
  const [ultimaActualizacion, setUltimaActualizacion] = useState(new Date());
  const [selectedPedido, setSelectedPedido] = useState(null); // Para el modal
  const [showModal, setShowModal] = useState(false);
  const { socket, connected } = useSocket();

  useEffect(() => {
    loadPedidosIniciales();
  }, []);

  useEffect(() => {
    if (socket && connected) {
      socket.on('pedido_nuevo', (data) => {
        const nuevoPedido = data.venta;
        if (nuevoPedido.estado_venta === 'PENDIENTE' || nuevoPedido.estado_venta === 'EN_PROCESO') {
          setPedidos(prev => {
            const existe = prev.find(p => p.id_venta === nuevoPedido.id_venta);
            if (existe) return prev;
            return [nuevoPedido, ...prev];
          });
          setUltimaActualizacion(new Date());
        }
      });

      socket.on('estado_pedido_actualizado', (data) => {
        setPedidos(prev => {
          if (data.estado_venta === 'COMPLETADA' || data.estado_venta === 'CANCELADA') {
            return prev.filter(p => p.id_venta !== data.id_venta);
          }
          return prev.map(p =>
            p.id_venta === data.id_venta
              ? { ...p, estado_venta: data.estado_venta }
              : p
          );
        });
        setUltimaActualizacion(new Date());
      });

      return () => {
        socket.off('pedido_nuevo');
        socket.off('estado_pedido_actualizado');
      };
    }
  }, [socket, connected]);

  const loadPedidosIniciales = async () => {
    try {
      const response = await ventasService.getAll({
        estado: 'PENDIENTE,EN_PROCESO'
      });
      const data = response.data?.data || response.data;
      setPedidos(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error al cargar pedidos iniciales:', error);
    }
  };

  const handleCambiarEstado = async (pedido, nuevoEstado) => {
    try {
      await ventasService.updateEstado(pedido.id_venta, { estado: nuevoEstado });
      // Actualización optimista: removemos o actualizamos localmente
      if (nuevoEstado === 'COMPLETADA' || nuevoEstado === 'CANCELADA') {
        setPedidos(prev => prev.filter(p => p.id_venta !== pedido.id_venta));
      } else {
        setPedidos(prev => prev.map(p =>
          p.id_venta === pedido.id_venta ? { ...p, estado_venta: nuevoEstado } : p
        ));
      }
      setShowModal(false);
      setSelectedPedido(null);
    } catch (error) {
      console.error('Error al cambiar estado:', error);
      alert('No se pudo cambiar el estado');
    }
  };

  const pedidosPendientes = pedidos.filter(p => p.estado_venta === 'PENDIENTE');
  const pedidosEnProceso = pedidos.filter(p => p.estado_venta === 'EN_PROCESO');

  // Tarjeta de resumen (visible en las columnas)
  const PedidoResumen = ({ pedido }) => {
    const tiempoAgo = formatTimeAgo(pedido.fecha_venta || pedido.created_at);
    const cantidadItems = (pedido.items || pedido.detalles || []).length;

    return (
      <Card className="display-resumen-card shadow-sm mb-3">
        <Card.Body className="d-flex align-items-center justify-content-between p-3">
          <div className="flex-grow-1">
            <div className="d-flex align-items-center gap-3 flex-wrap">
              <h3 className="display-resumen-numero mb-0">
                #{pedido.numero_factura || pedido.id_venta}
              </h3>
              <Badge bg={pedido.estado_venta === 'PENDIENTE' ? 'warning' : 'info'} className="px-3 py-2">
                {pedido.estado_venta === 'PENDIENTE' ? 'PENDIENTE' : 'EN PROCESO'}
              </Badge>
            </div>
            <div className="d-flex gap-4 mt-2 text-muted">
              {pedido.nombre_cliente && (
                <span><i className="bi bi-person me-1"></i>{pedido.nombre_cliente}</span>
              )}
              <span><i className="bi bi-clock me-1"></i>{tiempoAgo}</span>
              <span><i className="bi bi-bag me-1"></i>{cantidadItems} ítems</span>
            </div>
          </div>
          <Button
            variant="outline-primary"
            className="rounded-circle p-3"
            onClick={() => {
              setSelectedPedido(pedido);
              setShowModal(true);
            }}
          >
            <i className="bi bi-eye fs-4"></i>
          </Button>
        </Card.Body>
      </Card>
    );
  };

  // Modal de detalle completo (sin precios)
  const DetalleModal = () => {
    if (!selectedPedido) return null;

    const items = selectedPedido.items || selectedPedido.detalles || [];

    return (
      <Modal show={showModal} onHide={() => setShowModal(false)} fullscreen="md-down" size="lg">
        <Modal.Header closeButton className="bg-light">
          <Modal.Title className="fw-bold">
            Pedido #{selectedPedido.numero_factura || selectedPedido.id_venta}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4">
          {/* Info básica */}
          <div className="mb-4 p-3 bg-white rounded shadow-sm">
            <Row>
              <Col sm={6}>
                <p><i className="bi bi-person me-2"></i><strong>Cliente:</strong> {selectedPedido.nombre_cliente || 'Mostrador'}</p>
                <p><i className="bi bi-clock me-2"></i><strong>Recibido:</strong> {formatDateTime(selectedPedido.fecha_venta || selectedPedido.created_at)}</p>
              </Col>
              <Col sm={6}>
                <p><i className="bi bi-tag me-2"></i><strong>Estado:</strong> <Badge bg={selectedPedido.estado_venta === 'PENDIENTE' ? 'warning' : 'info'} className="px-3 py-2">{selectedPedido.estado_venta}</Badge></p>
                <p><i className="bi bi-box me-2"></i><strong>Total ítems:</strong> {items.length}</p>
              </Col>
            </Row>
          </div>

          {/* Items del pedido */}
          <h5 className="mb-3">Detalle de productos</h5>
          <div className="display-detalle-items">
            {items.map((item, idx) => (
              <div key={idx} className="display-detalle-item p-3 mb-3 bg-white rounded shadow-sm">
                {/* Encabezado del item */}
                <div className="d-flex align-items-start gap-3">
                  {item.imagen_url ? (
                    <img src={item.imagen_url} alt={item.nombre_producto || item.nombre} className="display-item-image rounded" />
                  ) : (
                    <div className="display-item-image-placeholder rounded d-flex align-items-center justify-content-center">
                      <i className="bi bi-image fs-1 text-muted"></i>
                    </div>
                  )}
                  <div className="flex-grow-1">
                    <h5 className="fw-bold mb-2">{item.nombre_producto || item.nombre}</h5>
                    <Badge bg="dark" className="px-3 py-2">Cantidad: x{item.cantidad}</Badge>
                  </div>
                </div>

                {/* Sabores */}
                {item.sabores?.length > 0 && (
                  <div className="mt-3 p-2 bg-light rounded">
                    <p className="mb-2 text-info fw-bold"><i className="bi bi-snow2 me-2"></i>Sabores:</p>
                    <div className="d-flex flex-wrap gap-2">
                      {item.sabores.map((s, i) => (
                        <Badge key={i} bg="info" className="px-3 py-2">{s.nombre_sabor || s.nombre}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Toppings (sin precio) */}
                {item.toppings?.length > 0 && (
                  <div className="mt-3 p-2 bg-light rounded">
                    <p className="mb-2 text-secondary fw-bold"><i className="bi bi-stars me-2"></i>Toppings:</p>
                    <div className="d-flex flex-wrap gap-2">
                      {item.toppings.map((t, i) => (
                        <Badge key={i} bg="secondary" className="px-3 py-2">{t.nombre_topping || t.nombre}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Siropes (sin precio) */}
                {item.siropes?.length > 0 && (
                  <div className="mt-3 p-2 bg-light rounded">
                    <p className="mb-2 text-warning fw-bold"><i className="bi bi-droplet-half me-2"></i>Siropes:</p>
                    <div className="d-flex flex-wrap gap-2">
                      {item.siropes.map((s, i) => (
                        <Badge key={i} bg="warning" text="dark" className="px-3 py-2">{s.nombre_sirope || s.nombre}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Modal.Body>
        <Modal.Footer className="bg-light d-flex justify-content-between">
          <div>
            {selectedPedido.estado_venta === 'PENDIENTE' && (
              <>
                <Button variant="success" size="lg" className="me-2" onClick={() => handleCambiarEstado(selectedPedido, 'EN_PROCESO')}>
                  <i className="bi bi-play-fill me-2"></i>Iniciar preparación
                </Button>
                <Button variant="danger" size="lg" onClick={() => handleCambiarEstado(selectedPedido, 'CANCELADA')}>
                  <i className="bi bi-x-circle me-2"></i>Cancelar
                </Button>
              </>
            )}
            {selectedPedido.estado_venta === 'EN_PROCESO' && (
              <>
                <Button variant="primary" size="lg" className="me-2" onClick={() => handleCambiarEstado(selectedPedido, 'COMPLETADA')}>
                  <i className="bi bi-check2-circle me-2"></i>Marcar como listo
                </Button>
                <Button variant="danger" size="lg" onClick={() => handleCambiarEstado(selectedPedido, 'CANCELADA')}>
                  <i className="bi bi-x-circle me-2"></i>Cancelar
                </Button>
              </>
            )}
          </div>
          <Button variant="secondary" size="lg" onClick={() => setShowModal(false)}>
            Cerrar
          </Button>
        </Modal.Footer>
      </Modal>
    );
  };

  return (
    <div className="display-screen-container">
      {/* Header */}
      <div className="display-header">
        <div className="container-fluid">
          <div className="d-flex justify-content-between align-items-center py-3 flex-wrap gap-3">
            <h1 className="display-title mb-0">
              🍦 Pedidos en Tiempo Real
            </h1>
            <div className="d-flex align-items-center gap-4 flex-wrap">
              <Badge
                bg={connected ? 'success' : 'danger'}
                className="display-badge px-4 py-3"
              >
                <i className={`bi ${connected ? 'bi-wifi' : 'bi-wifi-off'} me-2`}></i>
                {connected ? 'CONECTADO' : 'DESCONECTADO'}
              </Badge>
              <div className="text-white text-end">
                <small className="d-block opacity-75">Última actualización</small>
                <div className="fw-bold fs-5">{formatDateTime(ultimaActualizacion)}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {!connected && (
        <Alert variant="danger" className="m-4 fs-5">
          <i className="bi bi-exclamation-triangle me-2"></i>
          <strong>Sin conexión en tiempo real.</strong> Los pedidos no se actualizarán automáticamente.
        </Alert>
      )}

      {/* Contenido */}
      <div className="display-content p-3 p-lg-4">
        <Row className="g-4">
          {/* Pendientes */}
          <Col lg={6}>
            <Card className="display-section-card shadow-lg border-0 h-100">
              <Card.Header className="display-section-header bg-warning text-dark py-3">
                <div className="d-flex justify-content-between align-items-center">
                  <h2 className="mb-0 fw-bold fs-4 fs-lg-3">
                    <i className="bi bi-clock-history me-2"></i>
                    PENDIENTES
                  </h2>
                  <Badge bg="dark" className="display-count-badge px-4 py-2">
                    {pedidosPendientes.length}
                  </Badge>
                </div>
              </Card.Header>
              <Card.Body className="display-section-body p-3" style={{ maxHeight: 'calc(100vh - 250px)', overflowY: 'auto' }}>
                {pedidosPendientes.length === 0 ? (
                  <div className="display-empty-state text-center py-5">
                    <i className="bi bi-inbox display-empty-icon"></i>
                    <p className="display-empty-text mt-3">No hay pedidos pendientes</p>
                  </div>
                ) : (
                  pedidosPendientes.map(pedido => (
                    <PedidoResumen key={pedido.id_venta} pedido={pedido} />
                  ))
                )}
              </Card.Body>
            </Card>
          </Col>

          {/* En Proceso */}
          <Col lg={6}>
            <Card className="display-section-card shadow-lg border-0 h-100">
              <Card.Header className="display-section-header bg-info text-white py-3">
                <div className="d-flex justify-content-between align-items-center">
                  <h2 className="mb-0 fw-bold fs-4 fs-lg-3">
                    <i className="bi bi-hourglass-split me-2"></i>
                    EN PROCESO
                  </h2>
                  <Badge bg="dark" className="display-count-badge px-4 py-2">
                    {pedidosEnProceso.length}
                  </Badge>
                </div>
              </Card.Header>
              <Card.Body className="display-section-body p-3" style={{ maxHeight: 'calc(100vh - 250px)', overflowY: 'auto' }}>
                {pedidosEnProceso.length === 0 ? (
                  <div className="display-empty-state text-center py-5">
                    <i className="bi bi-inbox display-empty-icon"></i>
                    <p className="display-empty-text mt-3">No hay pedidos en proceso</p>
                  </div>
                ) : (
                  pedidosEnProceso.map(pedido => (
                    <PedidoResumen key={pedido.id_venta} pedido={pedido} />
                  ))
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </div>

      {/* Modal de detalle */}
      <DetalleModal />
    </div>
  );
};

export default DisplayScreen;