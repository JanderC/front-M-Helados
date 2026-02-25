// PedidosScreen.jsx (versión mejorada)
import { useState, useEffect, useCallback } from 'react';
import { Row, Col, Card, Badge, Button, Alert, Modal } from 'react-bootstrap';
import { ventasService } from '../../api/services/ventasService';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../hooks/useAuth';
import { formatCurrency, formatDateTime, formatTimeAgo } from '../../utils/formatters';
import { toast } from 'react-toastify';

/* ─────────────────────────────────────────────────────
   Componente: Tarjeta de resumen (para la lista)
───────────────────────────────────────────────────── */
const PedidoResumen = ({ pedido, onVerDetalle, hidePrices }) => {
  const items = pedido.items || pedido.detalles || [];
  const tiempoAgo = formatTimeAgo(pedido.fecha_venta || pedido.created_at);

  return (
    <div className={`pedido-resumen ${pedido.estado_venta === 'PENDIENTE' ? 'pendiente' : 'proceso'}`}>
      <div className="d-flex align-items-center justify-content-between w-100">
        <div className="flex-grow-1 me-2">
          <div className="d-flex align-items-center gap-2 flex-wrap">
            <span className="pedido-resumen-numero">
              #{pedido.numero_factura || pedido.id_venta}
            </span>
            <Badge className={`estado-badge-mini ${pedido.estado_venta === 'PENDIENTE' ? 'pendiente' : 'proceso'}`}>
              {pedido.estado_venta === 'PENDIENTE' ? 'PENDIENTE' : 'EN PROCESO'}
            </Badge>
          </div>
          <div className="pedido-resumen-meta">
            {pedido.nombre_cliente && (
              <span><i className="bi bi-person me-1" />{pedido.nombre_cliente}</span>
            )}
            <span><i className="bi bi-clock me-1" />{tiempoAgo}</span>
            <span><i className="bi bi-bag me-1" />{items.length} ítem(s)</span>
          </div>
        </div>
        <Button
          variant="outline-primary"
          className="btn-ver-detalle rounded-circle p-2"
          onClick={() => onVerDetalle(pedido)}
        >
          <i className="bi bi-eye fs-5" />
        </Button>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────
   Componente: Modal de detalle completo del pedido
───────────────────────────────────────────────────── */
const PedidoDetalleModal = ({ show, onHide, pedido, onCambiarEstado, onCancelar, procesando, hidePrices }) => {
  if (!pedido) return null;

  const items = pedido.items || pedido.detalles || [];
  const moneda = pedido.codigo_moneda || 'USD';
  const esPendiente = pedido.estado_venta === 'PENDIENTE';

  return (
    <Modal show={show} onHide={onHide} fullscreen="md-down" size="lg" centered>
      <Modal.Header closeButton className="bg-light">
        <Modal.Title className="fw-bold">
          Pedido #{pedido.numero_factura || pedido.id_venta}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className="p-4">
        {/* Información general */}
        <div className="mb-4 p-3 bg-white rounded shadow-sm">
          <Row>
            <Col sm={6}>
              <p><i className="bi bi-person me-2" /><strong>Cliente:</strong> {pedido.nombre_cliente || 'Mostrador'}</p>
              <p><i className="bi bi-clock me-2" /><strong>Recibido:</strong> {formatDateTime(pedido.fecha_venta || pedido.created_at)}</p>
            </Col>
            <Col sm={6}>
              <p><i className="bi bi-tag me-2" /><strong>Estado:</strong> <Badge bg={esPendiente ? 'warning' : 'info'} className="px-3 py-2">{pedido.estado_venta}</Badge></p>
              <p><i className="bi bi-box me-2" /><strong>Total ítems:</strong> {items.length}</p>
            </Col>
          </Row>
        </div>

        {/* Lista de ítems */}
        <h5 className="mb-3">Detalle de productos</h5>
        <div className="detalle-items-container">
          {items.length === 0 ? (
            <p className="text-muted text-center py-4">No hay productos en este pedido</p>
          ) : (
            items.map((item, idx) => (
              <div key={idx} className="detalle-item-card mb-3 p-3 bg-white rounded shadow-sm">
                {/* Imagen + nombre + cantidad */}
                <div className="d-flex align-items-start gap-3">
                  {item.imagen_url ? (
                    <img src={item.imagen_url} alt={item.nombre_producto || item.nombre} className="detalle-item-img" />
                  ) : (
                    <div className="detalle-item-img-placeholder">
                      <i className="bi bi-cup-straw" />
                    </div>
                  )}
                  <div className="flex-grow-1">
                    <h6 className="fw-bold mb-2">{item.nombre_producto || item.nombre}</h6>
                    <Badge bg="dark" className="px-3 py-2">Cantidad: x{item.cantidad}</Badge>
                  </div>
                </div>

                {/* Sabores */}
                {item.sabores?.length > 0 && (
                  <div className="mt-3 p-2 bg-light rounded">
                    <p className="mb-2 text-info fw-bold small"><i className="bi bi-snow2 me-2" />Sabores:</p>
                    <div className="d-flex flex-wrap gap-2">
                      {item.sabores.map((s, i) => (
                        <Badge key={i} bg="info" className="px-3 py-2">{s.nombre_sabor || s.nombre}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Toppings */}
                {item.toppings?.length > 0 && (
                  <div className="mt-3 p-2 bg-light rounded">
                    <p className="mb-2 text-secondary fw-bold small"><i className="bi bi-stars me-2" />Toppings:</p>
                    <div className="d-flex flex-wrap gap-2">
                      {item.toppings.map((t, i) => (
                        <Badge key={i} bg="secondary" className="px-3 py-2">{t.nombre_topping || t.nombre}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Siropes */}
                {item.siropes?.length > 0 && (
                  <div className="mt-3 p-2 bg-light rounded">
                    <p className="mb-2 text-warning fw-bold small"><i className="bi bi-droplet-half me-2" />Siropes:</p>
                    <div className="d-flex flex-wrap gap-2">
                      {item.siropes.map((s, i) => (
                        <Badge key={i} bg="warning" text="dark" className="px-3 py-2">{s.nombre_sirope || s.nombre}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </Modal.Body>
      <Modal.Footer className="bg-light d-flex justify-content-between align-items-center">
        <div className="d-flex gap-2">
          {esPendiente ? (
            <>
              <Button
                variant="success"
                size="lg"
                onClick={() => onCambiarEstado(pedido.id_venta, 'EN_PROCESO')}
                disabled={procesando}
              >
                <i className="bi bi-play-fill me-2" />Iniciar preparación
              </Button>
              <Button
                variant="danger"
                size="lg"
                onClick={() => onCancelar(pedido.id_venta)}
                disabled={procesando}
              >
                <i className="bi bi-x-circle me-2" />Cancelar
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="primary"
                size="lg"
                onClick={() => onCambiarEstado(pedido.id_venta, 'COMPLETADA')}
                disabled={procesando}
              >
                <i className="bi bi-check2-circle me-2" />Marcar como listo
              </Button>
              <Button
                variant="danger"
                size="lg"
                onClick={() => onCancelar(pedido.id_venta)}
                disabled={procesando}
              >
                <i className="bi bi-x-circle me-2" />Cancelar
              </Button>
            </>
          )}
        </div>
        <Button variant="secondary" size="lg" onClick={onHide}>
          Cerrar
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

/* ─────────────────────────────────────────────────────
   Pantalla principal
───────────────────────────────────────────────────── */
const PedidosScreen = () => {
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [selectedPedido, setSelectedPedido] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const { socket, connected } = useSocket();
  const { isAdmin } = useAuth();

  const hidePrices = !isAdmin;

  // Enriquecer un pedido con detalles completos
  const enrichPedido = useCallback(async (pedido) => {
    try {
      const res = await ventasService.getById(pedido.id_venta);
      const data = res.data?.data || res.data;
      return data || pedido;
    } catch {
      return pedido;
    }
  }, []);

  // Cargar pedidos iniciales
  const loadPedidos = useCallback(async () => {
    try {
      setLoading(true);
      const response = await ventasService.getAll({ estado: 'PENDIENTE,EN_PROCESO', limit: 50 });
      const raw = response.data?.data || response.data || [];
      const lista = Array.isArray(raw) ? raw : [];

      // Enriquecer cada pedido con detalles completos
      const enriquecidos = await Promise.all(lista.map(enrichPedido));
      setPedidos(enriquecidos);
    } catch (error) {
      console.error('Error al cargar pedidos:', error);
      toast.error('Error al cargar pedidos');
    } finally {
      setLoading(false);
    }
  }, [enrichPedido]);

  useEffect(() => {
    loadPedidos();
  }, [loadPedidos]);

  // Sockets
  useEffect(() => {
    if (!socket || !connected) return;

    const handleNuevoPedido = async (data) => {
      const pedidoSocket = data.venta;
      if (!pedidoSocket) return;

      toast.info(
        <div>
          <strong>¡Nuevo pedido!</strong>
          <div>#{pedidoSocket.numero_factura || pedidoSocket.id_venta}</div>
        </div>,
        { autoClose: 6000 }
      );

      if (!['PENDIENTE', 'EN_PROCESO'].includes(pedidoSocket.estado_venta)) return;

      const tieneItems = (pedidoSocket.items || pedidoSocket.detalles || []).length > 0;
      const pedidoFinal = tieneItems ? pedidoSocket : await enrichPedido(pedidoSocket);

      setPedidos(prev => {
        const existe = prev.find(p => p.id_venta === pedidoFinal.id_venta);
        if (existe) return prev;
        return [pedidoFinal, ...prev];
      });
    };

    const handleEstadoActualizado = (data) => {
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
    };

    socket.on('pedido_nuevo', handleNuevoPedido);
    socket.on('estado_pedido_actualizado', handleEstadoActualizado);

    return () => {
      socket.off('pedido_nuevo', handleNuevoPedido);
      socket.off('estado_pedido_actualizado', handleEstadoActualizado);
    };
  }, [socket, connected, enrichPedido]);

  // Cambiar estado
  const handleCambiarEstado = async (pedidoId, nuevoEstado) => {
    try {
      setProcesando(true);
      await ventasService.cambiarEstado(pedidoId, nuevoEstado);
      toast.success(nuevoEstado === 'COMPLETADA' ? '✅ Pedido completado' : '🔄 Estado actualizado');

      if (socket) {
        socket.emit('cambiar_estado_pedido', { id_venta: pedidoId, estado_venta: nuevoEstado });
      }

      setPedidos(prev => {
        if (nuevoEstado === 'COMPLETADA' || nuevoEstado === 'CANCELADA') {
          return prev.filter(p => p.id_venta !== pedidoId);
        }
        return prev.map(p => p.id_venta === pedidoId ? { ...p, estado_venta: nuevoEstado } : p);
      });

      // Cerrar modal si estaba abierto
      setShowModal(false);
      setSelectedPedido(null);
    } catch (error) {
      console.error('Error al cambiar estado:', error);
      toast.error('Error al cambiar estado del pedido');
    } finally {
      setProcesando(false);
    }
  };

  const handleCancelar = async (pedidoId) => {
    if (!window.confirm('¿Cancelar este pedido?')) return;
    await handleCambiarEstado(pedidoId, 'CANCELADA');
  };

  const handleVerDetalle = async (pedido) => {
    // Si el pedido no tiene items, lo enriquecemos
    if (!pedido.items && !pedido.detalles) {
      const pedidoCompleto = await enrichPedido(pedido);
      setSelectedPedido(pedidoCompleto);
    } else {
      setSelectedPedido(pedido);
    }
    setShowModal(true);
  };

  const pedidosPendientes = pedidos.filter(p => p.estado_venta === 'PENDIENTE');
  const pedidosEnProceso = pedidos.filter(p => p.estado_venta === 'EN_PROCESO');

  return (
    <>
      {/* Estilos adicionales para la nueva interfaz */}
      <style>{`
        /* ── Resumen card ── */
        .pedido-resumen {
          background: #fff;
          border-radius: 14px;
          border: 1.5px solid rgba(123,47,190,0.1);
          padding: 12px 16px;
          margin-bottom: 10px;
          box-shadow: 0 2px 8px rgba(123,47,190,0.04);
          transition: all 0.2s ease;
        }
        .pedido-resumen:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(123,47,190,0.1);
        }
        .pedido-resumen.pendiente {
          border-left: 4px solid #f59e0b;
        }
        .pedido-resumen.proceso {
          border-left: 4px solid #4DCFBD;
        }
        .pedido-resumen-numero {
          font-family: 'Syne', sans-serif;
          font-weight: 800;
          font-size: clamp(1rem, 3vw, 1.2rem);
          color: #1a0a2e;
        }
        .pedido-resumen-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 0.75rem 1rem;
          font-size: 0.75rem;
          color: #6c757d;
          margin-top: 4px;
        }
        .estado-badge-mini {
          font-size: 0.6rem;
          font-weight: 700;
          padding: 0.3rem 0.6rem;
          border-radius: 20px;
        }
        .estado-badge-mini.pendiente {
          background: rgba(245,158,11,0.15) !important;
          color: #b45309 !important;
        }
        .estado-badge-mini.proceso {
          background: rgba(77,207,189,0.15) !important;
          color: #0e7490 !important;
        }
        .btn-ver-detalle {
          width: 42px;
          height: 42px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-color: rgba(123,47,190,0.2);
          color: #7B2FBE;
        }
        .btn-ver-detalle:hover {
          background: #7B2FBE;
          color: #fff;
          border-color: #7B2FBE;
        }

        /* ── Modal de detalle ── */
        .detalle-items-container {
          max-height: 50vh;
          overflow-y: auto;
          padding-right: 6px;
        }
        .detalle-item-card {
          border-left: 4px solid #7B2FBE;
        }
        .detalle-item-img {
          width: 70px;
          height: 70px;
          object-fit: cover;
          border-radius: 10px;
          border: 2px solid #dee2e6;
        }
        .detalle-item-img-placeholder {
          width: 70px;
          height: 70px;
          border-radius: 10px;
          background: linear-gradient(135deg, #ede4f8, #d8c8f0);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2rem;
          color: #9580b0;
          border: 2px solid #dee2e6;
        }

        /* ── Scroll personalizado ── */
        .col-scroll-body {
          max-height: 70vh;
          overflow-y: auto;
          padding: 12px;
        }
        .col-scroll-body::-webkit-scrollbar {
          width: 4px;
        }
        .col-scroll-body::-webkit-scrollbar-track {
          background: transparent;
        }
        .col-scroll-body::-webkit-scrollbar-thumb {
          background: rgba(123,47,190,0.2);
          border-radius: 4px;
        }

        /* ── Empty state ── */
        .col-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 3rem 1rem;
          color: #94a3b8;
        }
        .col-empty i {
          font-size: 3rem;
          margin-bottom: 0.75rem;
          opacity: 0.4;
        }
        .col-empty p {
          font-size: 0.9rem;
          margin: 0;
        }

        /* ── Header de columnas ── */
        .col-estado-header {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 14px 18px;
          border-radius: 12px 12px 0 0;
          font-family: 'Syne', sans-serif;
          font-weight: 700;
          font-size: 0.95rem;
        }
        .col-estado-header.pendiente {
          background: linear-gradient(135deg, #f59e0b, #d97706);
          color: #fff;
        }
        .col-estado-header.proceso {
          background: linear-gradient(135deg, #4DCFBD, #0ea5e9);
          color: #fff;
        }

        /* ── Connection badge ── */
        .conn-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 5px 12px;
          border-radius: 999px;
          font-size: 0.75rem;
          font-weight: 700;
          border: 1.5px solid;
        }
        .conn-badge.on {
          background: rgba(77,207,189,0.1);
          border-color: rgba(77,207,189,0.3);
          color: #0e6b60;
        }
        .conn-badge.off {
          background: rgba(239,68,68,0.1);
          border-color: rgba(239,68,68,0.25);
          color: #dc2626;
        }
        .conn-dot {
          width: 7px; height: 7px; border-radius: 50%;
        }
        .conn-dot.on { background: #4DCFBD; animation: pulse-dot 2s ease infinite; }
        .conn-dot.off { background: #dc2626; }

        /* ── Loader ── */
        .pedidos-spinner {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 3.5rem 1rem;
          color: #9580b0;
        }
        .pedidos-spinner .ring {
          width: 36px; height: 36px;
          border-radius: 50%;
          border: 3px solid rgba(123,47,190,0.12);
          border-top-color: #7B2FBE;
          animation: spin 0.8s linear infinite;
          margin-bottom: 0.75rem;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse-dot { 0%,100%{opacity:1;} 50%{opacity:0.5;} }

        /* ── Responsive para tablet ── */
        @media (max-width: 768px) {
          .col-scroll-body {
            max-height: 60vh;
          }
          .pedido-resumen {
            padding: 10px 12px;
          }
          .pedido-resumen-meta {
            gap: 0.5rem;
            font-size: 0.7rem;
          }
          .btn-ver-detalle {
            width: 38px;
            height: 38px;
          }
          .detalle-item-img,
          .detalle-item-img-placeholder {
            width: 60px;
            height: 60px;
          }
        }
      `}</style>

      {/* Header */}
      <div className="d-flex flex-wrap align-items-center justify-content-between mb-3">
        <h2 className="pedidos-title">
          <i className="bi bi-clipboard-check me-2" />
          Gestión de Pedidos
        </h2>
        <div className="d-flex align-items-center gap-2">
          <div className={`conn-badge ${connected ? 'on' : 'off'}`}>
            <div className={`conn-dot ${connected ? 'on' : 'off'}`} />
            {connected ? 'En tiempo real' : 'Sin conexión'}
          </div>
          <Button
            variant="outline-secondary"
            size="sm"
            onClick={loadPedidos}
            disabled={loading}
            style={{ borderRadius: 8, fontWeight: 600, fontSize: '0.8rem' }}
          >
            <i className={`bi bi-arrow-clockwise me-1 ${loading ? 'opacity-50' : ''}`} />
            Actualizar
          </Button>
        </div>
      </div>

      {!connected && (
        <Alert variant="warning" className="mb-3" style={{ borderRadius: 10 }}>
          <i className="bi bi-exclamation-triangle me-2" />
          Sin conexión en tiempo real. Los pedidos no se actualizarán automáticamente.
        </Alert>
      )}

      <Row className="g-3">
        {/* Pendientes */}
        <Col lg={6}>
          <Card className="border-0 shadow-sm h-100 overflow-hidden">
            <div className="col-estado-header pendiente">
              <i className="bi bi-hourglass-split" />
              Pendientes
              <Badge bg="light" text="dark" pill style={{ marginLeft: 'auto', fontWeight: 700 }}>
                {pedidosPendientes.length}
              </Badge>
            </div>
            <div className="col-scroll-body">
              {loading ? (
                <div className="pedidos-spinner">
                  <div className="ring" />
                  <span>Cargando pedidos...</span>
                </div>
              ) : pedidosPendientes.length === 0 ? (
                <div className="col-empty">
                  <i className="bi bi-inbox" />
                  <p>No hay pedidos pendientes</p>
                </div>
              ) : (
                pedidosPendientes.map(pedido => (
                  <PedidoResumen
                    key={pedido.id_venta}
                    pedido={pedido}
                    onVerDetalle={handleVerDetalle}
                    hidePrices={hidePrices}
                  />
                ))
              )}
            </div>
          </Card>
        </Col>

        {/* En Proceso */}
        <Col lg={6}>
          <Card className="border-0 shadow-sm h-100 overflow-hidden">
            <div className="col-estado-header proceso">
              <i className="bi bi-gear-wide-connected" />
              En Preparación
              <Badge bg="light" text="dark" pill style={{ marginLeft: 'auto', fontWeight: 700 }}>
                {pedidosEnProceso.length}
              </Badge>
            </div>
            <div className="col-scroll-body">
              {loading ? (
                <div className="pedidos-spinner">
                  <div className="ring" />
                  <span>Cargando pedidos...</span>
                </div>
              ) : pedidosEnProceso.length === 0 ? (
                <div className="col-empty">
                  <i className="bi bi-inbox" />
                  <p>No hay pedidos en preparación</p>
                </div>
              ) : (
                pedidosEnProceso.map(pedido => (
                  <PedidoResumen
                    key={pedido.id_venta}
                    pedido={pedido}
                    onVerDetalle={handleVerDetalle}
                    hidePrices={hidePrices}
                  />
                ))
              )}
            </div>
          </Card>
        </Col>
      </Row>

      {/* Modal de detalle */}
      <PedidoDetalleModal
        show={showModal}
        onHide={() => setShowModal(false)}
        pedido={selectedPedido}
        onCambiarEstado={handleCambiarEstado}
        onCancelar={handleCancelar}
        procesando={procesando}
        hidePrices={hidePrices}
      />
    </>
  );
};

export default PedidosScreen;