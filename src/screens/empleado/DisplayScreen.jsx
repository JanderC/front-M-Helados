import { useState, useEffect } from 'react';
import { Row, Col, Card, Badge, Alert } from 'react-bootstrap';
import { ventasService } from '../../api/services/ventasService';
import { useSocket } from '../../context/SocketContext';
import { formatDateTime } from '../../utils/formatters';
import './DisplayScreen.css';

const DisplayScreen = () => {
  const [pedidos, setPedidos] = useState([]);
  const [ultimaActualizacion, setUltimaActualizacion] = useState(new Date());
  const { socket, connected } = useSocket();

  useEffect(() => {
    loadPedidosIniciales();
  }, []);

  useEffect(() => {
    if (socket && connected) {
      console.log('📺 Display conectado al socket');

      socket.on('pedido_nuevo', (data) => {
        console.log('🆕 Nuevo pedido recibido:', data);
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
        console.log('🔄 Estado actualizado:', data);
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

  const pedidosPendientes = pedidos.filter(p => p.estado_venta === 'PENDIENTE');
  const pedidosEnProceso = pedidos.filter(p => p.estado_venta === 'EN_PROCESO');

  // ✅ Componente de pedido SIN precios - solo información de preparación
  const PedidoCard = ({ pedido, borderColor, estadoTexto, estadoBadgeBg }) => (
    <Card className={`display-pedido-card border-${borderColor} shadow`}>
      <Card.Body className="p-4">
        {/* Header: número, fecha, cliente, estado */}
        <div className="d-flex justify-content-between align-items-start mb-3">
          <div>
            <h2 className="display-pedido-numero mb-2">
              #{pedido.numero_factura || pedido.id_venta}
            </h2>
            <div className="display-pedido-fecha">
              <i className="bi bi-clock me-2"></i>
              {formatDateTime(pedido.fecha_venta || pedido.created_at)}
            </div>
            {pedido.nombre_cliente && (
              <div className="mt-2">
                <Badge bg="light" text="dark" className="px-3 py-2" style={{ fontSize: '1rem' }}>
                  <i className="bi bi-person me-2"></i>
                  {pedido.nombre_cliente}
                </Badge>
              </div>
            )}
          </div>
          <Badge bg={estadoBadgeBg} className="display-estado-badge px-4 py-3">
            {estadoTexto}
          </Badge>
        </div>

        {/* Cantidad de items como resumen rápido */}
        <div className="mb-3">
          <Badge bg="dark" className="px-3 py-2" style={{ fontSize: '0.95rem' }}>
            <i className="bi bi-bag me-2"></i>
            {(pedido.items || pedido.detalles || []).length} producto(s)
          </Badge>
        </div>

        {/* Items del pedido - sin precios */}
        <div className="display-pedido-items">
          {(pedido.items || pedido.detalles || []).map((item, idx) => (
            <div key={idx} className="display-item mb-3 p-3 bg-light rounded">
              {/* Imagen y nombre */}
              <div className="d-flex align-items-start mb-2">
                {item.imagen_url ? (
                  <img
                    src={item.imagen_url}
                    alt={item.nombre_producto || item.nombre}
                    className="display-item-image rounded me-3"
                    style={{ width: '80px', height: '80px', objectFit: 'cover' }}
                  />
                ) : (
                  <div
                    className="display-item-image-placeholder rounded me-3 d-flex align-items-center justify-content-center"
                    style={{ width: '80px', height: '80px', background: '#dee2e6' }}
                  >
                    <i className="bi bi-image text-muted fs-3"></i>
                  </div>
                )}
                <div className="flex-grow-1">
                  <div className="display-item-nombre fw-bold mb-2 fs-5">
                    {item.nombre_producto || item.nombre}
                  </div>
                  <Badge bg="dark" className="px-3 py-2">
                    <i className="bi bi-box me-2"></i>
                    Cantidad: x{item.cantidad}
                  </Badge>
                </div>
              </div>

              {/* Sabores */}
              {item.sabores && item.sabores.length > 0 && (
                <div className="mt-3 p-2 bg-white rounded">
                  <div className="d-flex align-items-center mb-2">
                    <i className="bi bi-snow2 text-info me-2 fs-5"></i>
                    <strong className="text-info">Sabores:</strong>
                  </div>
                  <div className="d-flex flex-wrap gap-2">
                    {item.sabores.map((sabor, sIdx) => (
                      <Badge
                        key={sIdx}
                        bg="info"
                        className="px-3 py-2"
                        style={{ fontSize: '0.9rem' }}
                      >
                        <i className="bi bi-check-circle me-1"></i>
                        {sabor.nombre_sabor || sabor.nombre}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Toppings - ✅ SIN precio */}
              {item.toppings && item.toppings.length > 0 && (
                <div className="mt-3 p-2 bg-white rounded">
                  <div className="d-flex align-items-center mb-2">
                    <i className="bi bi-stars text-secondary me-2 fs-5"></i>
                    <strong className="text-secondary">Toppings:</strong>
                  </div>
                  <div className="d-flex flex-wrap gap-2">
                    {item.toppings.map((topping, tIdx) => (
                      <Badge
                        key={tIdx}
                        bg="secondary"
                        className="px-3 py-2"
                        style={{ fontSize: '0.9rem' }}
                      >
                        <i className="bi bi-plus-circle me-1"></i>
                        {topping.nombre_topping || topping.nombre}
                        {/* ✅ NO se muestra precio_adicional */}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Siropes - ✅ SIN precio */}
              {item.siropes && item.siropes.length > 0 && (
                <div className="mt-3 p-2 bg-white rounded">
                  <div className="d-flex align-items-center mb-2">
                    <i className="bi bi-droplet-half text-warning me-2 fs-5"></i>
                    <strong className="text-warning">Siropes:</strong>
                  </div>
                  <div className="d-flex flex-wrap gap-2">
                    {item.siropes.map((sirope, siIdx) => (
                      <Badge
                        key={siIdx}
                        bg="warning"
                        text="dark"
                        className="px-3 py-2"
                        style={{ fontSize: '0.9rem' }}
                      >
                        <i className="bi bi-droplet-fill me-1"></i>
                        {sirope.nombre_sirope || sirope.nombre}
                        {/* ✅ NO se muestra precio */}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* ✅ NO se muestra el total - eliminado el bloque display-pedido-total */}
      </Card.Body>
    </Card>
  );

  return (
    <div className="display-screen-container">
      {/* Header */}
      <div className="display-header">
        <div className="container-fluid">
          <div className="d-flex justify-content-between align-items-center py-3">
            <h1 className="display-title mb-0">
              🍦 Pedidos en Tiempo Real
            </h1>
            <div className="d-flex align-items-center gap-4">
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
      <div className="display-content p-4">
        <Row className="g-4">
          {/* Pendientes */}
          <Col lg={6}>
            <Card className="display-section-card shadow-lg border-0 h-100">
              <Card.Header className="display-section-header bg-warning text-dark py-4">
                <div className="d-flex justify-content-between align-items-center">
                  <h2 className="mb-0 fw-bold">
                    <i className="bi bi-clock-history me-3"></i>
                    PENDIENTES
                  </h2>
                  <Badge bg="dark" className="display-count-badge px-4 py-3">
                    {pedidosPendientes.length}
                  </Badge>
                </div>
              </Card.Header>
              <Card.Body className="display-section-body p-4" style={{ maxHeight: 'calc(100vh - 250px)', overflowY: 'auto' }}>
                {pedidosPendientes.length === 0 ? (
                  <div className="display-empty-state text-center py-5">
                    <i className="bi bi-inbox display-empty-icon"></i>
                    <p className="display-empty-text mt-3">No hay pedidos pendientes</p>
                  </div>
                ) : (
                  <div className="d-flex flex-column gap-4">
                    {pedidosPendientes.map((pedido) => (
                      <PedidoCard
                        key={pedido.id_venta}
                        pedido={pedido}
                        borderColor="warning"
                        estadoTexto="PENDIENTE"
                        estadoBadgeBg="warning"
                      />
                    ))}
                  </div>
                )}
              </Card.Body>
            </Card>
          </Col>

          {/* En Proceso */}
          <Col lg={6}>
            <Card className="display-section-card shadow-lg border-0 h-100">
              <Card.Header className="display-section-header bg-info text-white py-4">
                <div className="d-flex justify-content-between align-items-center">
                  <h2 className="mb-0 fw-bold">
                    <i className="bi bi-hourglass-split me-3"></i>
                    EN PROCESO
                  </h2>
                  <Badge bg="dark" className="display-count-badge px-4 py-3">
                    {pedidosEnProceso.length}
                  </Badge>
                </div>
              </Card.Header>
              <Card.Body className="display-section-body p-4" style={{ maxHeight: 'calc(100vh - 250px)', overflowY: 'auto' }}>
                {pedidosEnProceso.length === 0 ? (
                  <div className="display-empty-state text-center py-5">
                    <i className="bi bi-inbox display-empty-icon"></i>
                    <p className="display-empty-text mt-3">No hay pedidos en proceso</p>
                  </div>
                ) : (
                  <div className="d-flex flex-column gap-4">
                    {pedidosEnProceso.map((pedido) => (
                      <PedidoCard
                        key={pedido.id_venta}
                        pedido={pedido}
                        borderColor="info"
                        estadoTexto="EN PROCESO"
                        estadoBadgeBg="info"
                      />
                    ))}
                  </div>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </div>
    </div>
  );
};

export default DisplayScreen;