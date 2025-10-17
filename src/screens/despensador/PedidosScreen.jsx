import { useState, useEffect } from 'react';
import { Row, Col, Card, Badge, Button, Alert } from 'react-bootstrap';
import { ventasService } from '../../api/services/ventasService';
import { useSocket } from '../../hooks/useSocket';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { ESTADOS_PEDIDO, COLORES_ESTADO } from '../../utils/constants';
import { toast } from 'react-toastify';
import DetalleVentaModal from '../../components/ventas/DetalleVentaModal';

const PedidosScreen = () => {
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [pedidoSeleccionado, setPedidoSeleccionado] = useState(null);
  const { socket, connected } = useSocket();

  useEffect(() => {
    loadPedidos();
  }, []);

  useEffect(() => {
    if (socket && connected) {
      // Escuchar nuevo pedido
      socket.on('nuevo-pedido', (pedido) => {
        toast.info(`¡Nuevo pedido #${pedido.id}!`, {
          autoClose: 5000,
          position: 'top-right'
        });
        setPedidos(prev => [pedido, ...prev]);
      });

      // Escuchar actualización de pedido
      socket.on('pedido-actualizado', (pedido) => {
        setPedidos(prev =>
          prev.map(p => p.id === pedido.id ? pedido : p)
        );
        
        // Si el pedido seleccionado se actualizó, actualizar el modal
        if (pedidoSeleccionado && pedidoSeleccionado.id === pedido.id) {
          setPedidoSeleccionado(pedido);
        }
      });

      return () => {
        socket.off('nuevo-pedido');
        socket.off('pedido-actualizado');
      };
    }
  }, [socket, connected, pedidoSeleccionado]);

  const loadPedidos = async () => {
    try {
      setLoading(true);
      const response = await ventasService.getAll({
        estado: 'PENDIENTE,EN_PROCESO'
      });
      setPedidos(response.data);
    } catch (error) {
      console.error('Error al cargar pedidos:', error);
      toast.error('Error al cargar pedidos');
    } finally {
      setLoading(false);
    }
  };

  const handleVerDetalle = async (pedido) => {
    try {
      const response = await ventasService.getById(pedido.id);
      setPedidoSeleccionado(response.data);
      setShowModal(true);
    } catch (error) {
      console.error('Error al cargar detalle:', error);
      toast.error('Error al cargar detalle del pedido');
    }
  };

  const handleCambiarEstado = async (pedidoId, nuevoEstado) => {
    try {
      await ventasService.cambiarEstado(pedidoId, nuevoEstado);
      toast.success(`Pedido marcado como ${nuevoEstado}`);
      loadPedidos();
    } catch (error) {
      console.error('Error al cambiar estado:', error);
      toast.error('Error al cambiar estado del pedido');
    }
  };

  const pedidosPendientes = pedidos.filter(p => p.estado === 'PENDIENTE');
  const pedidosEnProceso = pedidos.filter(p => p.estado === 'EN_PROCESO');

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold">
          <i className="bi bi-clipboard-check me-2 text-primary"></i>
          Pedidos en Tiempo Real
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
            <Card.Body style={{ maxHeight: '600px', overflowY: 'auto' }}>
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
                    <Card key={pedido.id} className="border-start border-warning border-4">
                      <Card.Body>
                        <div className="d-flex justify-content-between align-items-start mb-2">
                          <div>
                            <h5 className="mb-1">Pedido #{pedido.id}</h5>
                            <small className="text-muted">
                              {formatDateTime(pedido.createdAt)}
                            </small>
                          </div>
                          <Badge bg="warning" text="dark" className="fs-6">
                            PENDIENTE
                          </Badge>
                        </div>

                        <div className="mb-3">
                          <strong className="text-primary fs-5">
                            {formatCurrency(pedido.total, pedido.moneda)}
                          </strong>
                          <span className="ms-2 text-muted">({pedido.moneda})</span>
                        </div>

                        <div className="mb-3">
                          <small className="text-muted d-block mb-1">
                            {pedido.items?.length || 0} producto(s)
                          </small>
                          {pedido.items?.slice(0, 2).map((item, idx) => (
                            <div key={idx} className="small">
                              • {item.nombreProducto || 'Producto'} x{item.cantidad}
                            </div>
                          ))}
                          {pedido.items?.length > 2 && (
                            <small className="text-muted">
                              +{pedido.items.length - 2} más...
                            </small>
                          )}
                        </div>

                        <div className="d-grid gap-2">
                          <Button
                            variant="primary"
                            onClick={() => handleCambiarEstado(pedido.id, 'EN_PROCESO')}
                          >
                            <i className="bi bi-play-circle me-2"></i>
                            Iniciar Preparación
                          </Button>
                          <Button
                            variant="outline-secondary"
                            size="sm"
                            onClick={() => handleVerDetalle(pedido)}
                          >
                            <i className="bi bi-eye me-1"></i>
                            Ver Detalle
                          </Button>
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
            <Card.Body style={{ maxHeight: '600px', overflowY: 'auto' }}>
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
                    <Card key={pedido.id} className="border-start border-info border-4">
                      <Card.Body>
                        <div className="d-flex justify-content-between align-items-start mb-2">
                          <div>
                            <h5 className="mb-1">Pedido #{pedido.id}</h5>
                            <small className="text-muted">
                              {formatDateTime(pedido.createdAt)}
                            </small>
                          </div>
                          <Badge bg="info" className="fs-6">
                            EN PROCESO
                          </Badge>
                        </div>

                        <div className="mb-3">
                          <strong className="text-primary fs-5">
                            {formatCurrency(pedido.total, pedido.moneda)}
                          </strong>
                          <span className="ms-2 text-muted">({pedido.moneda})</span>
                        </div>

                        <div className="mb-3">
                          <small className="text-muted d-block mb-1">
                            {pedido.items?.length || 0} producto(s)
                          </small>
                          {pedido.items?.slice(0, 2).map((item, idx) => (
                            <div key={idx} className="small">
                              • {item.nombreProducto || 'Producto'} x{item.cantidad}
                            </div>
                          ))}
                          {pedido.items?.length > 2 && (
                            <small className="text-muted">
                              +{pedido.items.length - 2} más...
                            </small>
                          )}
                        </div>

                        <div className="d-grid gap-2">
                          <Button
                            variant="success"
                            onClick={() => handleCambiarEstado(pedido.id, 'COMPLETADO')}
                          >
                            <i className="bi bi-check-circle me-2"></i>
                            Marcar Completado
                          </Button>
                          <Button
                            variant="outline-secondary"
                            size="sm"
                            onClick={() => handleVerDetalle(pedido)}
                          >
                            <i className="bi bi-eye me-1"></i>
                            Ver Detalle
                          </Button>
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

      {/* Modal de detalle */}
      <DetalleVentaModal
        show={showModal}
        onHide={() => setShowModal(false)}
        venta={pedidoSeleccionado}
        onEstadoChange={() => {
          loadPedidos();
          setShowModal(false);
        }}
      />
    </div>
  );
};

export default PedidosScreen;