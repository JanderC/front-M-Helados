import { useState, useEffect, useCallback } from 'react';
import { Row, Col, Card, Badge, Button, Alert } from 'react-bootstrap';
import { ventasService } from '../../api/services/ventasService';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../hooks/useAuth';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { toast } from 'react-toastify';

/* ─────────────────────────────────────────────────────
   Sub-componente: Tarjeta de un ítem del pedido
   Muestra imagen + nombre + cantidad + siropes/toppings
   El precio queda oculto si hidePrices=true
───────────────────────────────────────────────────── */
const ItemCard = ({ item, moneda, hidePrices }) => {
  const nombre = item.nombre_producto || item.nombre || '—';
  const imagen = item.imagen_url || item.imagenUrl;

  return (
    <div className="pedido-item-card">
      {/* Imagen */}
      <div className="pedido-item-img-wrap">
        {imagen ? (
          <img src={imagen} alt={nombre} className="pedido-item-img" />
        ) : (
          <div className="pedido-item-img-placeholder">
            <i className="bi bi-cup-straw" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="pedido-item-info">
        <div className="pedido-item-nombre">{nombre}</div>
        <div className="pedido-item-cantidad">
          <i className="bi bi-x-circle-fill me-1 opacity-50" style={{ fontSize: '0.65rem' }} />
          {item.cantidad} unidad{item.cantidad > 1 ? 'es' : ''}
        </div>

        {/* Sabores */}
        {item.sabores && item.sabores.length > 0 && (
          <div className="pedido-item-extras">
            <span className="extras-label">
              <i className="bi bi-snow2 me-1" />Sabores:
            </span>
            <div className="extras-badges">
              {item.sabores.map((s, i) => (
                <span key={i} className="extra-badge sabor">
                  {s.nombre_sabor || s.nombre}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Toppings */}
        {item.toppings && item.toppings.length > 0 && (
          <div className="pedido-item-extras">
            <span className="extras-label">
              <i className="bi bi-stars me-1" />Toppings:
            </span>
            <div className="extras-badges">
              {item.toppings.map((t, i) => (
                <span key={i} className="extra-badge topping">
                  {t.nombre_topping || t.nombre}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Siropes */}
        {item.siropes && item.siropes.length > 0 && (
          <div className="pedido-item-extras">
            <span className="extras-label">
              <i className="bi bi-droplet-fill me-1" />Siropes:
            </span>
            <div className="extras-badges">
              {item.siropes.map((s, i) => (
                <span key={i} className="extra-badge sirope">
                  {s.nombre_sirope || s.nombre}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Precio — solo admin */}
      {!hidePrices && (
        <div className="pedido-item-precio">
          {formatCurrency(
            (parseFloat(item.precio_unitario || item.precio || 0)) * parseInt(item.cantidad || 1),
            moneda
          )}
        </div>
      )}
    </div>
  );
};

/* ─────────────────────────────────────────────────────
   Sub-componente: Tarjeta completa de un pedido
───────────────────────────────────────────────────── */
const PedidoCard = ({ pedido, onCambiarEstado, onCancelar, procesando, hidePrices }) => {
  const items = pedido.items || pedido.detalles || [];
  const moneda = pedido.codigo_moneda || 'USD';
  const estado = pedido.estado_venta;
  const esPendiente = estado === 'PENDIENTE';

  return (
    <div className={`pedido-card ${esPendiente ? 'pendiente' : 'en-proceso'}`}>
      {/* Header */}
      <div className="pedido-card-header">
        <div>
          <div className="pedido-factura">
            <i className="bi bi-receipt me-2" />
            #{pedido.numero_factura || pedido.id_venta}
          </div>
          <div className="pedido-hora">
            <i className="bi bi-clock me-1 opacity-60" />
            {formatDateTime(pedido.fecha_venta || pedido.created_at)}
          </div>
          {pedido.nombre_cliente && (
            <div className="pedido-cliente">
              <i className="bi bi-person me-1 opacity-60" />
              {pedido.nombre_cliente}
            </div>
          )}
        </div>
        <div className="text-end">
          <Badge className={`estado-badge ${esPendiente ? 'pendiente' : 'proceso'}`}>
            {esPendiente ? (
              <><i className="bi bi-hourglass-split me-1" />PENDIENTE</>
            ) : (
              <><i className="bi bi-gear-wide-connected me-1" />EN PROCESO</>
            )}
          </Badge>
          {/* Total — solo admin */}
          {!hidePrices && (
            <div className="pedido-total">
              {formatCurrency(pedido.total || pedido.monto_total, moneda)}
              <span className="moneda-tag ms-1">{moneda}</span>
            </div>
          )}
          {/* Para despensador: solo cantidad de productos */}
          {hidePrices && (
            <div className="pedido-items-count">
              <i className="bi bi-bag me-1" />
              {items.length} producto{items.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      </div>

      {/* Items */}
      <div className="pedido-items-list">
        {items.length === 0 ? (
          <div className="pedido-items-empty">
            <i className="bi bi-question-circle me-2 opacity-50" />
            Sin detalle de productos
          </div>
        ) : (
          items.map((item, idx) => (
            <ItemCard
              key={idx}
              item={item}
              moneda={moneda}
              hidePrices={hidePrices}
            />
          ))
        )}
      </div>

      {/* Acciones */}
      <div className="pedido-acciones">
        {esPendiente ? (
          <Button
            className="btn-accion iniciar"
            onClick={() => onCambiarEstado(pedido.id_venta, 'EN_PROCESO')}
            disabled={procesando}
          >
            <i className="bi bi-play-circle-fill me-2" />
            Iniciar Preparación
          </Button>
        ) : (
          <Button
            className="btn-accion completar"
            onClick={() => onCambiarEstado(pedido.id_venta, 'COMPLETADA')}
            disabled={procesando}
          >
            <i className="bi bi-check-circle-fill me-2" />
            Marcar Completado
          </Button>
        )}
        <Button
          className="btn-accion cancelar"
          onClick={() => onCancelar(pedido.id_venta)}
          disabled={procesando}
        >
          <i className="bi bi-x-circle me-1" />
          Cancelar
        </Button>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────
   PANTALLA PRINCIPAL
───────────────────────────────────────────────────── */
const PedidosScreen = () => {
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const { socket, connected } = useSocket();
  const { isAdmin } = useAuth();

  // El despensador NO ve precios
  const hidePrices = !isAdmin;

  /* ── Cargar detalles completos de un pedido por ID ── */
  const enrichPedido = useCallback(async (pedido) => {
    try {
      const res = await ventasService.getById(pedido.id_venta);
      const data = res.data?.data || res.data;
      return data || pedido;
    } catch {
      return pedido;
    }
  }, []);

  /* ── Carga inicial: trae lista y luego enriquece cada pedido ── */
  const loadPedidos = useCallback(async () => {
    try {
      setLoading(true);
      const response = await ventasService.getAll({ estado: 'PENDIENTE,EN_PROCESO', limit: 50 });
      const raw = response.data?.data || response.data || [];
      const lista = Array.isArray(raw) ? raw : [];

      // Enriquecer cada pedido con sus detalles completos
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

  /* ── Socket: nuevo pedido ── */
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
        { autoClose: 6000, position: 'top-right' }
      );

      if (!['PENDIENTE', 'EN_PROCESO'].includes(pedidoSocket.estado_venta)) return;

      // Si el socket ya trae items completos, usarlos directamente
      // Si no, enriquecer desde la API
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
          return prev.filter(p => p.id_venta !== data.id_venta && p.id_venta !== parseInt(data.id_venta));
        }
        return prev.map(p =>
          p.id_venta === data.id_venta || p.id_venta === parseInt(data.id_venta)
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

  /* ── Cambiar estado ── */
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

  const pedidosPendientes = pedidos.filter(p => p.estado_venta === 'PENDIENTE');
  const pedidosEnProceso = pedidos.filter(p => p.estado_venta === 'EN_PROCESO');

  return (
    <>
      <style>{`
        /* ── Layout ── */
        .pedidos-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 1.5rem;
          flex-wrap: wrap;
          gap: 0.75rem;
        }
        .pedidos-title {
          font-family: 'Syne', sans-serif;
          font-weight: 800;
          font-size: 1.5rem;
          color: var(--text-primary, #1a0a2e);
          margin: 0;
        }
        .pedidos-title i { color: var(--brand-purple, #7B2FBE); }

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

        .col-scroll-body {
          max-height: 75vh;
          overflow-y: auto;
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .col-scroll-body::-webkit-scrollbar { width: 4px; }
        .col-scroll-body::-webkit-scrollbar-track { background: transparent; }
        .col-scroll-body::-webkit-scrollbar-thumb { background: rgba(123,47,190,0.2); border-radius: 4px; }

        .col-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 3rem 1rem;
          color: #94a3b8;
        }
        .col-empty i { font-size: 3rem; margin-bottom: 0.75rem; opacity: 0.4; }
        .col-empty p { font-size: 0.9rem; margin: 0; }

        /* ── Pedido card ── */
        .pedido-card {
          background: #fff;
          border-radius: 14px;
          border: 1.5px solid rgba(123,47,190,0.1);
          overflow: hidden;
          box-shadow: 0 2px 12px rgba(123,47,190,0.06);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .pedido-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(123,47,190,0.12);
        }
        .pedido-card.pendiente { border-left: 4px solid #f59e0b; }
        .pedido-card.en-proceso { border-left: 4px solid #4DCFBD; }

        .pedido-card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding: 14px 16px 10px;
          border-bottom: 1px solid rgba(123,47,190,0.06);
          background: #faf8fe;
        }
        .pedido-factura {
          font-family: 'Syne', sans-serif;
          font-weight: 800;
          font-size: 1rem;
          color: #1a0a2e;
        }
        .pedido-hora {
          font-size: 0.75rem;
          color: #94a3b8;
          margin-top: 2px;
        }
        .pedido-cliente {
          font-size: 0.8rem;
          color: #7B2FBE;
          margin-top: 3px;
          font-weight: 600;
        }

        .estado-badge {
          font-family: 'DM Sans', sans-serif;
          font-weight: 700;
          font-size: 0.7rem;
          letter-spacing: 0.06em;
          padding: 5px 10px;
          border-radius: 999px;
          border: none;
        }
        .estado-badge.pendiente {
          background: rgba(245,158,11,0.15) !important;
          color: #b45309 !important;
        }
        .estado-badge.proceso {
          background: rgba(77,207,189,0.15) !important;
          color: #0e7490 !important;
        }

        .pedido-total {
          font-family: 'Syne', sans-serif;
          font-weight: 800;
          font-size: 1.1rem;
          color: #7B2FBE;
          margin-top: 6px;
        }
        .pedido-items-count {
          font-size: 0.8rem;
          color: #94a3b8;
          margin-top: 6px;
          font-weight: 600;
        }
        .moneda-tag {
          font-size: 0.65rem;
          color: #9580b0;
          font-weight: 600;
          vertical-align: middle;
        }

        /* ── Items list ── */
        .pedido-items-list {
          padding: 10px 14px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .pedido-items-empty {
          font-size: 0.82rem;
          color: #94a3b8;
          padding: 8px 0;
          text-align: center;
        }

        /* ── Item card ── */
        .pedido-item-card {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 10px 12px;
          background: #f8f5fe;
          border-radius: 10px;
          border: 1px solid rgba(123,47,190,0.07);
        }

        .pedido-item-img-wrap { flex-shrink: 0; }
        .pedido-item-img {
          width: 64px;
          height: 64px;
          object-fit: cover;
          border-radius: 10px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .pedido-item-img-placeholder {
          width: 64px;
          height: 64px;
          border-radius: 10px;
          background: linear-gradient(135deg, #ede4f8, #d8c8f0);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #9580b0;
          font-size: 1.6rem;
        }

        .pedido-item-info { flex: 1; min-width: 0; }
        .pedido-item-nombre {
          font-family: 'Syne', sans-serif;
          font-weight: 700;
          font-size: 0.9rem;
          color: #1a0a2e;
          margin-bottom: 2px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .pedido-item-cantidad {
          font-size: 0.75rem;
          color: #9580b0;
          margin-bottom: 6px;
        }

        .pedido-item-extras { margin-top: 5px; }
        .extras-label {
          font-size: 0.68rem;
          color: #9580b0;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          display: block;
          margin-bottom: 3px;
        }
        .extras-badges { display: flex; flex-wrap: wrap; gap: 4px; }
        .extra-badge {
          display: inline-flex;
          align-items: center;
          padding: 3px 8px;
          border-radius: 999px;
          font-size: 0.72rem;
          font-weight: 600;
          font-family: 'DM Sans', sans-serif;
        }
        .extra-badge.sabor {
          background: rgba(14,165,233,0.12);
          color: #0369a1;
        }
        .extra-badge.topping {
          background: rgba(123,47,190,0.1);
          color: #5E1F96;
        }
        .extra-badge.sirope {
          background: rgba(245,158,11,0.12);
          color: #92400e;
        }

        .pedido-item-precio {
          flex-shrink: 0;
          font-family: 'Syne', sans-serif;
          font-weight: 800;
          font-size: 0.9rem;
          color: #7B2FBE;
          white-space: nowrap;
          margin-top: 2px;
        }

        /* ── Acciones ── */
        .pedido-acciones {
          display: flex;
          gap: 8px;
          padding: 12px 14px;
          border-top: 1px solid rgba(123,47,190,0.06);
          background: #faf8fe;
        }
        .btn-accion {
          flex: 1;
          font-family: 'DM Sans', sans-serif;
          font-weight: 700;
          font-size: 0.85rem;
          border: none;
          border-radius: 9px;
          padding: 9px 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        }
        .btn-accion.iniciar {
          background: linear-gradient(135deg, #7B2FBE, #5E1F96);
          color: #fff;
          box-shadow: 0 3px 10px rgba(123,47,190,0.3);
          flex: 2;
        }
        .btn-accion.iniciar:hover {
          filter: brightness(1.1);
          transform: translateY(-1px);
          box-shadow: 0 5px 16px rgba(123,47,190,0.4);
        }
        .btn-accion.completar {
          background: linear-gradient(135deg, #4DCFBD, #0ea5e9);
          color: #fff;
          box-shadow: 0 3px 10px rgba(77,207,189,0.3);
          flex: 2;
        }
        .btn-accion.completar:hover {
          filter: brightness(1.06);
          transform: translateY(-1px);
          box-shadow: 0 5px 16px rgba(77,207,189,0.4);
        }
        .btn-accion.cancelar {
          background: rgba(239,68,68,0.08);
          color: #dc2626;
          border: 1.5px solid rgba(239,68,68,0.2);
        }
        .btn-accion.cancelar:hover {
          background: rgba(239,68,68,0.15);
          border-color: rgba(239,68,68,0.35);
        }
        .btn-accion:disabled { opacity: 0.6; cursor: not-allowed; transform: none !important; }

        /* ── Connection badge ── */
        .conn-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 5px 12px;
          border-radius: 999px;
          font-size: 0.75rem;
          font-weight: 700;
          font-family: 'DM Sans', sans-serif;
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

        /* ── Responsive ── */
        @media (max-width: 576px) {
          .pedido-item-img, .pedido-item-img-placeholder { width: 52px; height: 52px; }
          .pedido-item-nombre { font-size: 0.85rem; }
          .btn-accion { font-size: 0.8rem; padding: 8px 8px; }
        }
      `}</style>

      {/* Header */}
      <div className="pedidos-header">
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
        {/* ── Pendientes ── */}
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
                  <span style={{ fontSize: '0.85rem' }}>Cargando pedidos...</span>
                </div>
              ) : pedidosPendientes.length === 0 ? (
                <div className="col-empty">
                  <i className="bi bi-inbox" />
                  <p>No hay pedidos pendientes</p>
                </div>
              ) : (
                pedidosPendientes.map(pedido => (
                  <PedidoCard
                    key={pedido.id_venta}
                    pedido={pedido}
                    onCambiarEstado={handleCambiarEstado}
                    onCancelar={handleCancelar}
                    procesando={procesando}
                    hidePrices={hidePrices}
                  />
                ))
              )}
            </div>
          </Card>
        </Col>

        {/* ── En Proceso ── */}
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
                  <span style={{ fontSize: '0.85rem' }}>Cargando pedidos...</span>
                </div>
              ) : pedidosEnProceso.length === 0 ? (
                <div className="col-empty">
                  <i className="bi bi-inbox" />
                  <p>No hay pedidos en preparación</p>
                </div>
              ) : (
                pedidosEnProceso.map(pedido => (
                  <PedidoCard
                    key={pedido.id_venta}
                    pedido={pedido}
                    onCambiarEstado={handleCambiarEstado}
                    onCancelar={handleCancelar}
                    procesando={procesando}
                    hidePrices={hidePrices}
                  />
                ))
              )}
            </div>
          </Card>
        </Col>
      </Row>
    </>
  );
};

export default PedidosScreen;