import { useState, useEffect } from 'react';
import { Row, Col, Card, Badge, Button, Alert, Modal } from 'react-bootstrap';
import { ventasService } from '../../api/services/ventasService';
import { useSocket } from '../../context/SocketContext';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { toast } from 'react-toastify';

const PedidosScreen = () => {
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDetalleModal, setShowDetalleModal] = useState(false);
  const [pedidoSeleccionado, setPedidoSeleccionado] = useState(null);
  const [procesando, setProcesando] = useState(false);
  const { socket, connected } = useSocket();

  useEffect(() => {
    loadPedidos();
  }, []);

  useEffect(() => {
    if (socket && connected) {
      console.log('👂 Escuchando eventos de socket...');

      // Escuchar nuevo pedido
      socket.on('pedido_nuevo', (data) => {
        console.log('📦 Nuevo pedido recibido:', data);
        toast.info(`¡Nuevo pedido #${data.venta.numero_factura || data.venta.id_venta}!`, {
          autoClose: 5000,
          position: 'top-right'
        });
        
        const nuevoPedido = data.venta;
        // Solo agregar si es PENDIENTE o EN_PROCESO
        if (nuevoPedido.estado_venta === 'PENDIENTE' || nuevoPedido.estado_venta === 'EN_PROCESO') {
          setPedidos(prev => {
            const existe = prev.find(p => p.id_venta === nuevoPedido.id_venta);
            if (existe) return prev;
            return [nuevoPedido, ...prev];
          });
        }
      });

      // Escuchar actualización de pedido
      socket.on('estado_pedido_actualizado', (data) => {
        console.log('🔄 Estado actualizado:', data);
        setPedidos(prev => {
          // Si el pedido se completó o canceló, removerlo
          if (data.estado_venta === 'COMPLETADA' || data.estado_venta === 'CANCELADA') {
            return prev.filter(p => p.id_venta !== data.id_venta);
          }
          
          // Actualizar estado del pedido existente
          return prev.map(p => 
            p.id_venta === data.id_venta 
              ? { ...p, estado_venta: data.estado_venta, ...data.venta }
              : p
          );
        });
      });

      return () => {
        socket.off('pedido_nuevo');
        socket.off('estado_pedido_actualizado');
      };
    }
  }, [socket, connected]);

  const loadPedidos = async () => {
    try {
      setLoading(true);
      const response = await ventasService.getAll({
        estado: 'PENDIENTE,EN_PROCESO'
      });
      
      const data = response.data?.data || response.data;
      setPedidos(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error al cargar pedidos:', error);
      toast.error('Error al cargar pedidos');
    } finally {
      setLoading(false);
    }
  };

  const handleVerDetalle = (pedido) => {
    setPedidoSeleccionado(pedido);
    setShowDetalleModal(true);
  };

  const handleCambiarEstado = async (pedidoId, nuevoEstado) => {
    try {
      setProcesando(true);
      await ventasService.cambiarEstado(pedidoId, nuevoEstado);
      
      toast.success(`Pedido ${nuevoEstado === 'COMPLETADA' ? 'completado' : 'actualizado'} correctamente`);
      
      // Notificar por socket
      if (socket) {
        socket.emit('cambiar_estado_pedido', {
          id_venta: pedidoId,
          estado_venta: nuevoEstado
        });
      }
      
      loadPedidos();
    } catch (error) {
      console.error('Error al cambiar estado:', error);
      toast.error('Error al cambiar estado del pedido');
    } finally {
      setProcesando(false);
    }
  };

  const handleCancelar = async (pedidoId) => {
    if (!window.confirm('¿Estás seguro de cancelar este pedido?')) {
      return;
    }
    await handleCambiarEstado(pedidoId, 'CANCELADA');
  };

  const pedidosPendientes = pedidos.filter(p => p.estado_venta === 'PENDIENTE');
  const pedidosEnProceso = pedidos.filter(p => p.estado_venta === 'EN_PROCESO');

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold">
          <i className="bi bi-clipboard-check me-2 text-primary"></i>
          Gestión de Pedidos
        </h2>
        <Badge bg={connected ? 'success' : 'danger'} className="fs-6">
          <i className={`bi ${connected ? 'bi-wifi' : 'bi-wifi-off'} me-1`}></i>
          {connected ? 'Conectado' : 'Desconectado'}
        </Badge>
      </div>

      {!connected && (
        <Alert variant="warning" className="mb-4">
          <i className="bi bi-exclamation-triangle me-2"></i>
          Sin conexión en tiempo real. Los pedidos no se actualizarán automáticamente.
        </Alert>
      )}

      <Row>
        {/* Pedidos Pendientes */}
        <Col lg={6} className="mb-4">
          <Card className="border-0 shadow-sm h-100">
            <Card.Header className="bg-warning text-dark">
              <h5 className="mb-0">
                <i className="bi bi-clock-history me-2"></i>
                Pendientes ({pedidosPendientes.length})
              </h5>
            </Card.Header>
            <Card.Body style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              {loading ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Cargando...</span>
                  </div>
                </div>
              ) : pedidosPendientes.length === 0 ? (
                <div className="text-center py-5 text-muted">
                  <i className="bi bi-inbox" style={{ fontSize: '3rem' }}></i>
                  <p className="mt-3">No hay pedidos pendientes</p>
                </div>
              ) : (
                <div className="d-flex flex-column gap-3">
                  {pedidosPendientes.map(pedido => (
                    <Card key={pedido.id_venta} className="border-start border-warning border-4">
                      <Card.Body>
                        <div className="d-flex justify-content-between align-items-start mb-2">
                          <div>
                            <h5 className="mb-1">
                              Pedido #{pedido.numero_factura || pedido.id_venta}
                            </h5>
                            <small className="text-muted">
                              {formatDateTime(pedido.fecha_venta || pedido.created_at)}
                            </small>
                          </div>
                          <Badge bg="warning" text="dark" className="fs-6">
                            PENDIENTE
                          </Badge>
                        </div>

                        <div className="mb-3">
                          <strong className="text-primary fs-5">
                            {formatCurrency(pedido.total || pedido.monto_total, pedido.codigo_moneda || 'USD')}
                          </strong>
                          <span className="ms-2 text-muted">({pedido.codigo_moneda || 'USD'})</span>
                        </div>

                        {/* Items con imágenes */}
                        <div className="mb-3">
                          <small className="text-muted d-block mb-2">
                            <strong>{(pedido.items || pedido.detalles || []).length} producto(s)</strong>
                          </small>
                          {(pedido.items || pedido.detalles || []).slice(0, 3).map((item, idx) => (
                            <div key={idx} className="d-flex align-items-center mb-2 p-2 bg-light rounded">
                              {item.imagen_url ? (
                                <img
                                  src={item.imagen_url}
                                  alt={item.nombre_producto || item.nombre}
                                  style={{
                                    width: '50px',
                                    height: '50px',
                                    objectFit: 'cover',
                                    borderRadius: '8px',
                                    marginRight: '10px'
                                  }}
                                />
                              ) : (
                                <div
                                  className="bg-secondary rounded d-flex align-items-center justify-content-center me-2"
                                  style={{ width: '50px', height: '50px' }}
                                >
                                  <i className="bi bi-image text-white"></i>
                                </div>
                              )}
                              <div className="flex-grow-1">
                                <div className="fw-bold small">
                                  {item.nombre_producto || item.nombre}
                                </div>
                                <div className="text-muted small">
                                  Cantidad: {item.cantidad}
                                </div>
                              </div>
                            </div>
                          ))}
                          {(pedido.items || pedido.detalles || []).length > 3 && (
                            <small className="text-muted">
                              +{(pedido.items || pedido.detalles || []).length - 3} más...
                            </small>
                          )}
                        </div>

                        <div className="d-grid gap-2">
                          <Button
                            variant="primary"
                            onClick={() => handleCambiarEstado(pedido.id_venta, 'EN_PROCESO')}
                            disabled={procesando}
                          >
                            <i className="bi bi-play-circle me-2"></i>
                            Iniciar Preparación
                          </Button>
                          <div className="d-flex gap-2">
                            <Button
                              variant="outline-info"
                              size="sm"
                              className="flex-grow-1"
                              onClick={() => handleVerDetalle(pedido)}
                            >
                              <i className="bi bi-eye me-1"></i>
                              Ver Detalle
                            </Button>
                            <Button
                              variant="outline-danger"
                              size="sm"
                              onClick={() => handleCancelar(pedido.id_venta)}
                              disabled={procesando}
                            >
                              <i className="bi bi-x-circle me-1"></i>
                              Cancelar
                            </Button>
                          </div>
                        </div>
                      </Card.Body>
                    </Card>
                  ))}
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>

        {/* Pedidos En Proceso */}
        <Col lg={6} className="mb-4">
          <Card className="border-0 shadow-sm h-100">
            <Card.Header className="bg-info text-white">
              <h5 className="mb-0">
                <i className="bi bi-hourglass-split me-2"></i>
                En Proceso ({pedidosEnProceso.length})
              </h5>
            </Card.Header>
            <Card.Body style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              {loading ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Cargando...</span>
                  </div>
                </div>
              ) : pedidosEnProceso.length === 0 ? (
                <div className="text-center py-5 text-muted">
                  <i className="bi bi-inbox" style={{ fontSize: '3rem' }}></i>
                  <p className="mt-3">No hay pedidos en proceso</p>
                </div>
              ) : (
                <div className="d-flex flex-column gap-3">
                  {pedidosEnProceso.map(pedido => (
                    <Card key={pedido.id_venta} className="border-start border-info border-4">
                      <Card.Body>
                        <div className="d-flex justify-content-between align-items-start mb-2">
                          <div>
                            <h5 className="mb-1">
                              Pedido #{pedido.numero_factura || pedido.id_venta}
                            </h5>
                            <small className="text-muted">
                              {formatDateTime(pedido.fecha_venta || pedido.created_at)}
                            </small>
                          </div>
                          <Badge bg="info" className="fs-6">
                            EN PROCESO
                          </Badge>
                        </div>

                        <div className="mb-3">
                          <strong className="text-primary fs-5">
                            {formatCurrency(pedido.total || pedido.monto_total, pedido.codigo_moneda || 'USD')}
                          </strong>
                          <span className="ms-2 text-muted">({pedido.codigo_moneda || 'USD'})</span>
                        </div>

                        {/* Items con imágenes */}
                        <div className="mb-3">
                          <small className="text-muted d-block mb-2">
                            <strong>{(pedido.items || pedido.detalles || []).length} producto(s)</strong>
                          </small>
                          {(pedido.items || pedido.detalles || []).slice(0, 3).map((item, idx) => (
                            <div key={idx} className="d-flex align-items-center mb-2 p-2 bg-light rounded">
                              {item.imagen_url ? (
                                <img
                                  src={item.imagen_url}
                                  alt={item.nombre_producto || item.nombre}
                                  style={{
                                    width: '50px',
                                    height: '50px',
                                    objectFit: 'cover',
                                    borderRadius: '8px',
                                    marginRight: '10px'
                                  }}
                                />
                              ) : (
                                <div
                                  className="bg-secondary rounded d-flex align-items-center justify-content-center me-2"
                                  style={{ width: '50px', height: '50px' }}
                                >
                                  <i className="bi bi-image text-white"></i>
                                </div>
                              )}
                              <div className="flex-grow-1">
                                <div className="fw-bold small">
                                  {item.nombre_producto || item.nombre}
                                </div>
                                <div className="text-muted small">
                                  Cantidad: {item.cantidad}
                                </div>
                              </div>
                            </div>
                          ))}
                          {(pedido.items || pedido.detalles || []).length > 3 && (
                            <small className="text-muted">
                              +{(pedido.items || pedido.detalles || []).length - 3} más...
                            </small>
                          )}
                        </div>

                        <div className="d-grid gap-2">
                          <Button
                            variant="success"
                            onClick={() => handleCambiarEstado(pedido.id_venta, 'COMPLETADA')}
                            disabled={procesando}
                          >
                            <i className="bi bi-check-circle me-2"></i>
                            Marcar Completado
                          </Button>
                          <div className="d-flex gap-2">
                            <Button
                              variant="outline-info"
                              size="sm"
                              className="flex-grow-1"
                              onClick={() => handleVerDetalle(pedido)}
                            >
                              <i className="bi bi-eye me-1"></i>
                              Ver Detalle
                            </Button>
                            <Button
                              variant="outline-danger"
                              size="sm"
                              onClick={() => handleCancelar(pedido.id_venta)}
                              disabled={procesando}
                            >
                              <i className="bi bi-x-circle me-1"></i>
                              Cancelar
                            </Button>
                          </div>
                        </div>
                      </Card.Body>
                    </Card>
                  ))}
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Modal de Detalle */}
      <Modal show={showDetalleModal} onHide={() => setShowDetalleModal(false)} size="lg" centered>
        <Modal.Header closeButton className="bg-primary text-white">
          <Modal.Title>
            <i className="bi bi-receipt me-2"></i>
            Detalle del Pedido #{pedidoSeleccionado?.numero_factura || pedidoSeleccionado?.id_venta}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {pedidoSeleccionado && (
            <>
              <Row className="mb-4">
                <Col md={6}>
                  <div className="mb-3">
                    <small className="text-muted d-block">Fecha y Hora</small>
                    <strong>{formatDateTime(pedidoSeleccionado.fecha_venta || pedidoSeleccionado.created_at)}</strong>
                  </div>
                  <div className="mb-3">
                    <small className="text-muted d-block">Estado</small>
                    <Badge bg={pedidoSeleccionado.estado_venta === 'PENDIENTE' ? 'warning' : 'info'} className="fs-6">
                      {pedidoSeleccionado.estado_venta}
                    </Badge>
                  </div>
                </Col>
                <Col md={6}>
                  <div className="mb-3">
                    <small className="text-muted d-block">Moneda</small>
                    <strong>{pedidoSeleccionado.codigo_moneda || 'USD'}</strong>
                  </div>
                  <div className="mb-3">
                    <small className="text-muted d-block">Total</small>
                    <h4 className="text-success mb-0">
                      {formatCurrency(pedidoSeleccionado.total || pedidoSeleccionado.monto_total, pedidoSeleccionado.codigo_moneda || 'USD')}
                    </h4>
                  </div>
                </Col>
              </Row>

              <h6 className="border-bottom pb-2 mb-3">
                <i className="bi bi-basket me-2"></i>
                Productos del Pedido
              </h6>

              <div className="mb-3">
                {(pedidoSeleccionado.items || pedidoSeleccionado.detalles || []).map((item, idx) => (
                  <Card key={idx} className="mb-2">
                    <Card.Body className="p-3">
                      <Row className="align-items-center">
                        <Col xs={3} md={2}>
                          {item.imagen_url ? (
                            <img
                              src={item.imagen_url}
                              alt={item.nombre_producto || item.nombre}
                              className="img-fluid rounded"
                              style={{ maxHeight: '80px', objectFit: 'cover' }}
                            />
                          ) : (
                            <div
                              className="bg-light rounded d-flex align-items-center justify-content-center"
                              style={{ height: '80px' }}
                            >
                              <i className="bi bi-image text-muted" style={{ fontSize: '2rem' }}></i>
                            </div>
                          )}
                        </Col>
                        <Col xs={9} md={10}>
                          <div className="d-flex justify-content-between align-items-start">
                            <div>
                              <strong className="d-block">{item.nombre_producto || item.nombre}</strong>
                              <small className="text-muted">
                                {formatCurrency(item.precio_unitario || item.precio, pedidoSeleccionado.codigo_moneda || 'USD')} x {item.cantidad}
                              </small>
                              {item.toppings && item.toppings.length > 0 && (
                                <div className="mt-1">
                                  {item.toppings.map((topping, tIdx) => (
                                    <Badge key={tIdx} bg="secondary" className="me-1">
                                      + {topping.nombre_topping || topping.nombre}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                            <strong className="text-primary">
                              {formatCurrency(
                                (parseFloat(item.precio_unitario || item.precio) * parseInt(item.cantidad)),
                                pedidoSeleccionado.codigo_moneda || 'USD'
                              )}
                            </strong>
                          </div>
                        </Col>
                      </Row>
                    </Card.Body>
                  </Card>
                ))}
              </div>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDetalleModal(false)}>
            Cerrar
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default PedidosScreen;