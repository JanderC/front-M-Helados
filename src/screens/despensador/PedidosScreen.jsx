// PedidosScreen.jsx
import { useState, useEffect, useCallback, useRef } from 'react';
import { Row, Col, Card, Badge, Button, Alert, Modal } from 'react-bootstrap';
import { ventasService } from '../../api/services/ventasService';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../hooks/useAuth';
import { formatCurrency, formatDateTime, formatTimeAgo } from '../../utils/formatters';


/* ─────────────────────────────────────────────────────
   Componente: Campana flotante con dropdown
───────────────────────────────────────────────────── */
const BellNotifications = ({ notifs, onDismiss, onDismissAll, onVerDetalle }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Cerrar al click fuera
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Abrir automáticamente cuando llega la primera notif
  const prevCount = useRef(0);
  useEffect(() => {
    if (notifs.length > prevCount.current && notifs.length === 1) {
      setOpen(true);
    }
    prevCount.current = notifs.length;
  }, [notifs.length]);

  const count = notifs.length;

  return (
    <div className="bell-wrapper" ref={ref}>
      {/* Botón campana */}
      <button
        className={`bell-btn ${count > 0 ? 'has-notifs' : ''} ${open ? 'active' : ''}`}
        onClick={() => setOpen(o => !o)}
        title="Notificaciones de pedidos"
      >
        <i className={`bi ${count > 0 ? 'bi-bell-fill' : 'bi-bell'}`} />
        {count > 0 && (
          <span className="bell-badge">{count > 99 ? '99+' : count}</span>
        )}
        {count > 0 && <span className="bell-ring-anim" />}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="bell-panel">
          <div className="bell-panel-header">
            <div className="bell-panel-title">
              <i className="bi bi-bell-fill me-2" />
              Pedidos nuevos
              {count > 0 && (
                <span className="bell-panel-count">{count}</span>
              )}
            </div>
            {count > 0 && (
              <button className="bell-clear-all" onClick={onDismissAll}>
                <i className="bi bi-check2-all me-1" />Limpiar todo
              </button>
            )}
          </div>

          <div className="bell-panel-body">
            {count === 0 ? (
              <div className="bell-empty">
                <i className="bi bi-bell-slash" />
                <p>Sin notificaciones</p>
              </div>
            ) : (
              notifs.map(n => (
                <div key={n.id_venta} className="bell-notif-item">
                  <div className="bell-notif-dot" />
                  <div className="bell-notif-content">
                    <div className="bell-notif-top">
                      <span className="bell-notif-label">¡Nuevo pedido!</span>
                      <span className="bell-notif-time">
                        {formatTimeAgo(n.fecha_venta || n.created_at)}
                      </span>
                    </div>
                    <div className="bell-notif-num">
                      #{n.numero_factura || n.id_venta}
                      {n.nombre_cliente && (
                        <span className="bell-notif-cliente">
                          <i className="bi bi-person me-1" />{n.nombre_cliente}
                        </span>
                      )}
                    </div>
                    <div className="bell-notif-items-count">
                      <i className="bi bi-bag me-1" />
                      {(n.items || n.detalles || []).length} ítem(s)
                    </div>
                  </div>
                  <div className="bell-notif-btns">
                    <button
                      className="bell-btn-ver"
                      onClick={() => { onVerDetalle(n); setOpen(false); }}
                      title="Ver pedido"
                    >
                      <i className="bi bi-eye" />
                    </button>
                    <button
                      className="bell-btn-x"
                      onClick={() => onDismiss(n.id_venta)}
                      title="Eliminar notificación"
                    >
                      <i className="bi bi-x" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {count > 0 && (
            <div className="bell-panel-footer">
              {count} {count === 1 ? 'notificación pendiente' : 'notificaciones pendientes'}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/* ─────────────────────────────────────────────────────
   Componente: Tarjeta de resumen (para la lista)
───────────────────────────────────────────────────── */
const PedidoResumen = ({ pedido, onVerDetalle }) => {
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
const PedidoDetalleModal = ({ show, onHide, pedido, onCambiarEstado, onCancelar, procesando }) => {
  if (!pedido) return null;

  const items = pedido.items || pedido.detalles || [];
  const esPendiente = pedido.estado_venta === 'PENDIENTE';

  return (
    <Modal show={show} onHide={onHide} fullscreen="md-down" size="lg" centered>
      <Modal.Header closeButton className="bg-light">
        <Modal.Title className="fw-bold">
          Pedido #{pedido.numero_factura || pedido.id_venta}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className="p-4">
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

        <h5 className="mb-3">Detalle de productos</h5>
        <div className="detalle-items-container">
          {items.length === 0 ? (
            <p className="text-muted text-center py-4">No hay productos en este pedido</p>
          ) : (
            items.map((item, idx) => (
              <div key={idx} className="detalle-item-card mb-3 p-3 bg-white rounded shadow-sm">
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
              <Button variant="success" size="lg" onClick={() => onCambiarEstado(pedido.id_venta, 'EN_PROCESO')} disabled={procesando}>
                <i className="bi bi-play-fill me-2" />Iniciar preparación
              </Button>
              <Button variant="danger" size="lg" onClick={() => onCancelar(pedido.id_venta)} disabled={procesando}>
                <i className="bi bi-x-circle me-2" />Cancelar
              </Button>
            </>
          ) : (
            <>
              <Button variant="primary" size="lg" onClick={() => onCambiarEstado(pedido.id_venta, 'COMPLETADA')} disabled={procesando}>
                <i className="bi bi-check2-circle me-2" />Marcar como listo
              </Button>
              <Button variant="danger" size="lg" onClick={() => onCancelar(pedido.id_venta)} disabled={procesando}>
                <i className="bi bi-x-circle me-2" />Cancelar
              </Button>
            </>
          )}
        </div>
        <Button variant="secondary" size="lg" onClick={onHide}>Cerrar</Button>
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
  const [notifs, setNotifs] = useState([]);

  const { socket, connected } = useSocket();
  const { isAdmin } = useAuth();
  const hidePrices = !isAdmin;

  const dismissNotif    = useCallback((id) => setNotifs(prev => prev.filter(n => n.id_venta !== id)), []);
  const dismissAllNotifs = useCallback(() => setNotifs([]), []);

  const enrichPedido = useCallback(async (pedido) => {
    try {
      const res = await ventasService.getById(pedido.id_venta);
      return res.data?.data || res.data || pedido;
    } catch { return pedido; }
  }, []);

  const loadPedidos = useCallback(async () => {
    try {
      setLoading(true);
      const response = await ventasService.getAll({ estado: 'PENDIENTE,EN_PROCESO', limit: 50 });
      const raw = response.data?.data || response.data || [];
      const lista = Array.isArray(raw) ? raw : [];
      const enriquecidos = await Promise.all(lista.map(enrichPedido));
      setPedidos(enriquecidos);
    } catch (error) {
      console.error('Error al cargar pedidos:', error);
    } finally { setLoading(false); }
  }, [enrichPedido]);

  useEffect(() => { loadPedidos(); }, [loadPedidos]);

  // Sockets
  useEffect(() => {
    if (!socket || !connected) return;

    const handleNuevoPedido = async (data) => {
      const pedidoSocket = data.venta;
      if (!pedidoSocket) return;
      if (!['PENDIENTE', 'EN_PROCESO'].includes(pedidoSocket.estado_venta)) return;

      const tieneItems = (pedidoSocket.items || pedidoSocket.detalles || []).length > 0;
      const pedidoFinal = tieneItems ? pedidoSocket : await enrichPedido(pedidoSocket);

      setNotifs(prev =>
        prev.find(n => n.id_venta === pedidoFinal.id_venta) ? prev : [pedidoFinal, ...prev]
      );
      setPedidos(prev =>
        prev.find(p => p.id_venta === pedidoFinal.id_venta) ? prev : [pedidoFinal, ...prev]
      );
    };

    const handleEstadoActualizado = (data) => {
      if (data.estado_venta === 'COMPLETADA' || data.estado_venta === 'CANCELADA') {
        setNotifs(prev => prev.filter(n => n.id_venta !== data.id_venta));
      }
      setPedidos(prev => {
        if (data.estado_venta === 'COMPLETADA' || data.estado_venta === 'CANCELADA')
          return prev.filter(p => p.id_venta !== data.id_venta);
        return prev.map(p => p.id_venta === data.id_venta ? { ...p, estado_venta: data.estado_venta } : p);
      });
    };

    socket.on('pedido_nuevo', handleNuevoPedido);
    socket.on('estado_pedido_actualizado', handleEstadoActualizado);
    return () => {
      socket.off('pedido_nuevo', handleNuevoPedido);
      socket.off('estado_pedido_actualizado', handleEstadoActualizado);
    };
  }, [socket, connected, enrichPedido]);

  const handleCambiarEstado = async (pedidoId, nuevoEstado) => {
    try {
      setProcesando(true);
      await ventasService.cambiarEstado(pedidoId, nuevoEstado);
      if (socket) socket.emit('cambiar_estado_pedido', { id_venta: pedidoId, estado_venta: nuevoEstado });
      setNotifs(prev => prev.filter(n => n.id_venta !== pedidoId));
      setPedidos(prev => {
        if (nuevoEstado === 'COMPLETADA' || nuevoEstado === 'CANCELADA')
          return prev.filter(p => p.id_venta !== pedidoId);
        return prev.map(p => p.id_venta === pedidoId ? { ...p, estado_venta: nuevoEstado } : p);
      });
      setShowModal(false);
      setSelectedPedido(null);
    } catch {
    } finally { setProcesando(false); }
  };

  const handleCancelar = async (pedidoId) => {
    if (!window.confirm('¿Cancelar este pedido?')) return;
    await handleCambiarEstado(pedidoId, 'CANCELADA');
  };

  const handleVerDetalle = useCallback(async (pedido) => {
    const p = (!pedido.items && !pedido.detalles) ? await enrichPedido(pedido) : pedido;
    setSelectedPedido(p);
    setShowModal(true);
  }, [enrichPedido]);

  const handleVerDesdeNotif = useCallback(async (pedido) => {
    dismissNotif(pedido.id_venta);
    await handleVerDetalle(pedido);
  }, [dismissNotif, handleVerDetalle]);

  const pedidosPendientes = pedidos.filter(p => p.estado_venta === 'PENDIENTE');
  const pedidosEnProceso  = pedidos.filter(p => p.estado_venta === 'EN_PROCESO');

  return (
    <>
      <style>{`
        /* ══════════════ CAMPANA ══════════════ */
        .bell-wrapper { position: relative; display: inline-flex; }

        .bell-btn {
          position: relative; width: 42px; height: 42px;
          border-radius: 12px; border: 1.5px solid rgba(123,47,190,0.18);
          background: #fff; color: #9580b0; font-size: 1.15rem;
          cursor: pointer; display: flex; align-items: center; justify-content: center;
          transition: all 0.2s ease; outline: none; flex-shrink: 0;
        }
        .bell-btn:hover { border-color: #7B2FBE; color: #7B2FBE; background: rgba(123,47,190,0.05); }
        .bell-btn.active { border-color: #7B2FBE; color: #7B2FBE; background: rgba(123,47,190,0.07); box-shadow: 0 0 0 3px rgba(123,47,190,0.1); }
        .bell-btn.has-notifs { color: #7B2FBE; border-color: rgba(123,47,190,0.4); animation: bell-shake 0.5s ease 0.2s; }

        .bell-badge {
          position: absolute; top: -7px; right: -7px;
          min-width: 19px; height: 19px; border-radius: 999px;
          background: #dc2626; color: #fff;
          font-size: 0.6rem; font-weight: 800; font-family: 'Syne', sans-serif;
          display: flex; align-items: center; justify-content: center;
          padding: 0 4px; border: 2px solid #fff;
          box-shadow: 0 2px 6px rgba(220,38,38,0.45);
          animation: badge-pop 0.3s cubic-bezier(0.34,1.56,0.64,1);
        }
        .bell-ring-anim {
          position: absolute; inset: -5px; border-radius: 15px;
          border: 2px solid rgba(123,47,190,0.2);
          animation: ring-pulse 2.2s ease infinite; pointer-events: none;
        }

        @keyframes bell-shake {
          0%,100%{transform:rotate(0)} 20%{transform:rotate(-14deg)} 40%{transform:rotate(14deg)} 60%{transform:rotate(-9deg)} 80%{transform:rotate(9deg)}
        }
        @keyframes badge-pop { from{transform:scale(0)} to{transform:scale(1)} }
        @keyframes ring-pulse { 0%,100%{opacity:.5;transform:scale(1)} 50%{opacity:0;transform:scale(1.18)} }

        /* ══════════════ PANEL DROPDOWN ══════════════ */
        .bell-panel {
          position: absolute; top: calc(100% + 10px); right: 0;
          width: 320px; background: #fff; border-radius: 16px;
          border: 1.5px solid rgba(123,47,190,0.12);
          box-shadow: 0 20px 50px rgba(26,10,46,0.13), 0 4px 12px rgba(123,47,190,0.08);
          z-index: 1050; overflow: hidden;
          animation: panel-drop 0.22s cubic-bezier(0.34,1.2,0.64,1);
        }
        @keyframes panel-drop {
          from{opacity:0;transform:translateY(-10px) scale(0.96)}
          to  {opacity:1;transform:translateY(0)     scale(1)}
        }

        .bell-panel-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 13px 16px 12px;
          background: linear-gradient(135deg, #6d28d9, #a855f7);
          color: #fff;
        }
        .bell-panel-title {
          font-family: 'Syne', sans-serif; font-weight: 800; font-size: 0.88rem;
          display: flex; align-items: center;
        }
        .bell-panel-count {
          background: rgba(255,255,255,0.22); border-radius: 999px;
          padding: 1px 8px; font-size: 0.74rem; margin-left: 7px; font-weight: 800;
        }
        .bell-clear-all {
          background: rgba(255,255,255,0.16); border: 1px solid rgba(255,255,255,0.28);
          border-radius: 8px; color: #fff; font-size: 0.72rem; font-weight: 700;
          padding: 4px 10px; cursor: pointer; transition: background 0.15s;
          display: flex; align-items: center; white-space: nowrap;
        }
        .bell-clear-all:hover { background: rgba(255,255,255,0.3); }

        .bell-panel-body { max-height: 340px; overflow-y: auto; padding: 6px 0; }
        .bell-panel-body::-webkit-scrollbar { width: 3px; }
        .bell-panel-body::-webkit-scrollbar-thumb { background: rgba(123,47,190,0.2); border-radius: 3px; }

        .bell-empty {
          display: flex; flex-direction: column; align-items: center;
          justify-content: center; padding: 2.5rem 1rem; color: #c4b5d8;
        }
        .bell-empty i { font-size: 2.2rem; margin-bottom: 0.5rem; opacity: 0.45; }
        .bell-empty p { font-size: 0.82rem; margin: 0; }

        .bell-notif-item {
          display: flex; align-items: flex-start; gap: 10px;
          padding: 10px 14px; border-bottom: 1px solid rgba(123,47,190,0.06);
          transition: background 0.15s; animation: notif-in 0.2s ease;
        }
        .bell-notif-item:last-child { border-bottom: none; }
        .bell-notif-item:hover { background: rgba(123,47,190,0.03); }
        @keyframes notif-in { from{opacity:0;transform:translateX(-6px)} to{opacity:1;transform:none} }

        .bell-notif-dot {
          width: 8px; height: 8px; border-radius: 50%; background: #7B2FBE;
          flex-shrink: 0; margin-top: 7px; box-shadow: 0 0 0 3px rgba(123,47,190,0.14);
        }
        .bell-notif-content { flex: 1; min-width: 0; }
        .bell-notif-top {
          display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px;
        }
        .bell-notif-label { font-size: 0.7rem; font-weight: 800; color: #7B2FBE; text-transform: uppercase; letter-spacing: 0.05em; }
        .bell-notif-time  { font-size: 0.67rem; color: #94a3b8; }
        .bell-notif-num {
          font-family: 'Syne', sans-serif; font-weight: 800; font-size: 0.92rem; color: #1a0a2e;
          display: flex; align-items: center; gap: 7px; flex-wrap: wrap;
        }
        .bell-notif-cliente { font-family: 'DM Sans', sans-serif; font-weight: 500; font-size: 0.74rem; color: #6b7280; }
        .bell-notif-items-count { font-size: 0.71rem; color: #94a3b8; margin-top: 2px; }

        .bell-notif-btns { display: flex; gap: 5px; flex-shrink: 0; margin-top: 3px; }
        .bell-btn-ver {
          width: 28px; height: 28px; border-radius: 8px;
          background: rgba(123,47,190,0.08); border: 1px solid rgba(123,47,190,0.18);
          color: #7B2FBE; font-size: 0.82rem; cursor: pointer;
          display: flex; align-items: center; justify-content: center; transition: all 0.15s;
        }
        .bell-btn-ver:hover { background: #7B2FBE; color: #fff; border-color: #7B2FBE; }
        .bell-btn-x {
          width: 28px; height: 28px; border-radius: 8px;
          background: rgba(239,68,68,0.07); border: 1px solid rgba(239,68,68,0.18);
          color: #dc2626; font-size: 1rem; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.15s; line-height: 1; padding: 0;
        }
        .bell-btn-x:hover { background: #dc2626; color: #fff; border-color: #dc2626; }

        .bell-panel-footer {
          padding: 8px 16px; font-size: 0.72rem; color: #94a3b8;
          text-align: center; border-top: 1px solid rgba(123,47,190,0.07); background: #faf8fe;
        }

        /* ══════════════ RESTO ══════════════ */
        .pedido-resumen {
          background: #fff; border-radius: 14px; border: 1.5px solid rgba(123,47,190,0.1);
          padding: 12px 16px; margin-bottom: 10px; box-shadow: 0 2px 8px rgba(123,47,190,0.04);
          transition: all 0.2s ease;
        }
        .pedido-resumen:hover { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(123,47,190,0.1); }
        .pedido-resumen.pendiente { border-left: 4px solid #f59e0b; }
        .pedido-resumen.proceso   { border-left: 4px solid #4DCFBD; }
        .pedido-resumen-numero { font-family:'Syne',sans-serif; font-weight:800; font-size:clamp(1rem,3vw,1.2rem); color:#1a0a2e; }
        .pedido-resumen-meta { display:flex; flex-wrap:wrap; gap:.75rem 1rem; font-size:.75rem; color:#6c757d; margin-top:4px; }
        .estado-badge-mini { font-size:.6rem; font-weight:700; padding:.3rem .6rem; border-radius:20px; }
        .estado-badge-mini.pendiente { background:rgba(245,158,11,.15)!important; color:#b45309!important; }
        .estado-badge-mini.proceso   { background:rgba(77,207,189,.15)!important;  color:#0e7490!important; }
        .btn-ver-detalle { width:42px; height:42px; display:flex; align-items:center; justify-content:center; border-color:rgba(123,47,190,.2); color:#7B2FBE; }
        .btn-ver-detalle:hover { background:#7B2FBE; color:#fff; border-color:#7B2FBE; }
        .detalle-items-container { max-height:50vh; overflow-y:auto; padding-right:6px; }
        .detalle-item-card { border-left:4px solid #7B2FBE; }
        .detalle-item-img { width:70px; height:70px; object-fit:cover; border-radius:10px; border:2px solid #dee2e6; }
        .detalle-item-img-placeholder {
          width:70px; height:70px; border-radius:10px;
          background:linear-gradient(135deg,#ede4f8,#d8c8f0);
          display:flex; align-items:center; justify-content:center;
          font-size:2rem; color:#9580b0; border:2px solid #dee2e6;
        }
        .col-scroll-body { max-height:70vh; overflow-y:auto; padding:12px; }
        .col-scroll-body::-webkit-scrollbar { width:4px; }
        .col-scroll-body::-webkit-scrollbar-track { background:transparent; }
        .col-scroll-body::-webkit-scrollbar-thumb { background:rgba(123,47,190,.2); border-radius:4px; }
        .col-empty { display:flex; flex-direction:column; align-items:center; justify-content:center; padding:3rem 1rem; color:#94a3b8; }
        .col-empty i { font-size:3rem; margin-bottom:.75rem; opacity:.4; }
        .col-empty p { font-size:.9rem; margin:0; }
        .col-estado-header { display:flex; align-items:center; gap:10px; padding:14px 18px; border-radius:12px 12px 0 0; font-family:'Syne',sans-serif; font-weight:700; font-size:.95rem; }
        .col-estado-header.pendiente { background:linear-gradient(135deg,#f59e0b,#d97706); color:#fff; }
        .col-estado-header.proceso   { background:linear-gradient(135deg,#4DCFBD,#0ea5e9); color:#fff; }
        .conn-badge { display:inline-flex; align-items:center; gap:6px; padding:5px 12px; border-radius:999px; font-size:.75rem; font-weight:700; border:1.5px solid; }
        .conn-badge.on  { background:rgba(77,207,189,.1);  border-color:rgba(77,207,189,.3);  color:#0e6b60; }
        .conn-badge.off { background:rgba(239,68,68,.1);   border-color:rgba(239,68,68,.25);  color:#dc2626; }
        .conn-dot { width:7px; height:7px; border-radius:50%; }
        .conn-dot.on  { background:#4DCFBD; animation:pulse-dot 2s ease infinite; }
        .conn-dot.off { background:#dc2626; }
        .pedidos-spinner { display:flex; flex-direction:column; align-items:center; justify-content:center; padding:3.5rem 1rem; color:#9580b0; }
        .pedidos-spinner .ring { width:36px; height:36px; border-radius:50%; border:3px solid rgba(123,47,190,.12); border-top-color:#7B2FBE; animation:spin .8s linear infinite; margin-bottom:.75rem; }
        @keyframes spin      { to{transform:rotate(360deg)} }
        @keyframes pulse-dot { 0%,100%{opacity:1} 50%{opacity:.5} }
        @media (max-width:768px) {
          .col-scroll-body { max-height:60vh; }
          .pedido-resumen  { padding:10px 12px; }
          .bell-panel      { width:290px; right:-10px; }
        }
      `}</style>

      {/* ── Header ── */}
      <div className="d-flex flex-wrap align-items-center justify-content-between mb-3">
        <h2 style={{ fontFamily:'Syne,sans-serif', fontWeight:800, color:'#1a0a2e', fontSize:'clamp(1.2rem,4vw,1.6rem)', margin:0 }}>
          <i className="bi bi-clipboard-check me-2" />
          Gestión de Pedidos
        </h2>
        <div className="d-flex align-items-center gap-2">
          <div className={`conn-badge ${connected ? 'on' : 'off'}`}>
            <div className={`conn-dot ${connected ? 'on' : 'off'}`} />
            {connected ? 'En tiempo real' : 'Sin conexión'}
          </div>
          <Button
            variant="outline-secondary" size="sm" onClick={loadPedidos} disabled={loading}
            style={{ borderRadius:8, fontWeight:600, fontSize:'0.8rem' }}
          >
            <i className={`bi bi-arrow-clockwise me-1 ${loading ? 'opacity-50' : ''}`} />
            Actualizar
          </Button>

          {/* ── Campana ── */}
          <BellNotifications
            notifs={notifs}
            onDismiss={dismissNotif}
            onDismissAll={dismissAllNotifs}
            onVerDetalle={handleVerDesdeNotif}
          />
        </div>
      </div>

      {!connected && (
        <Alert variant="warning" className="mb-3" style={{ borderRadius:10 }}>
          <i className="bi bi-exclamation-triangle me-2" />
          Sin conexión en tiempo real. Los pedidos no se actualizarán automáticamente.
        </Alert>
      )}

      {/* ── Columnas ── */}
      <Row className="g-3">
        <Col lg={6}>
          <Card className="border-0 shadow-sm h-100 overflow-hidden">
            <div className="col-estado-header pendiente">
              <i className="bi bi-hourglass-split" />Pendientes
              <Badge bg="light" text="dark" pill style={{ marginLeft:'auto', fontWeight:700 }}>
                {pedidosPendientes.length}
              </Badge>
            </div>
            <div className="col-scroll-body">
              {loading ? (
                <div className="pedidos-spinner"><div className="ring" /><span>Cargando pedidos...</span></div>
              ) : pedidosPendientes.length === 0 ? (
                <div className="col-empty"><i className="bi bi-inbox" /><p>No hay pedidos pendientes</p></div>
              ) : (
                pedidosPendientes.map(p => (
                  <PedidoResumen key={p.id_venta} pedido={p} onVerDetalle={handleVerDetalle} />
                ))
              )}
            </div>
          </Card>
        </Col>
        <Col lg={6}>
          <Card className="border-0 shadow-sm h-100 overflow-hidden">
            <div className="col-estado-header proceso">
              <i className="bi bi-gear-wide-connected" />En Preparación
              <Badge bg="light" text="dark" pill style={{ marginLeft:'auto', fontWeight:700 }}>
                {pedidosEnProceso.length}
              </Badge>
            </div>
            <div className="col-scroll-body">
              {loading ? (
                <div className="pedidos-spinner"><div className="ring" /><span>Cargando pedidos...</span></div>
              ) : pedidosEnProceso.length === 0 ? (
                <div className="col-empty"><i className="bi bi-inbox" /><p>No hay pedidos en preparación</p></div>
              ) : (
                pedidosEnProceso.map(p => (
                  <PedidoResumen key={p.id_venta} pedido={p} onVerDetalle={handleVerDetalle} />
                ))
              )}
            </div>
          </Card>
        </Col>
      </Row>

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