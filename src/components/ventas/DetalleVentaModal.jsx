import { useState, useEffect } from 'react';
import { Modal, Button, Badge, ListGroup, Row, Col, Spinner, Alert } from 'react-bootstrap';
import { ventasService } from '../../api/services/ventasService';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { toast } from 'react-toastify';
import { useSocket } from '../../contexts/SocketContext'; // 🔥 NUEVO

const DetalleVentaModal = ({ show, onHide, ventaId, onStatusChange }) => {
  const [venta, setVenta] = useState(null);
  const [loading, setLoading] = useState(false);
  const [procesando, setProcesando] = useState(false);

  // 🔥 NUEVO - Hook de Socket
  const { emitirCambioEstado } = useSocket();

  useEffect(() => {
    if (show && ventaId) {
      cargarDetalleVenta();
    }
  }, [show, ventaId]);

  const cargarDetalleVenta = async () => {
    try {
      setLoading(true);
      const response = await ventasService.getById(ventaId);
      const ventaData = response.data?.data || response.data;
      console.log('Venta cargada:', ventaData);
      setVenta(ventaData);
    } catch (error) {
      console.error('Error al cargar detalle de venta:', error);
      toast.error('Error al cargar detalle de venta');
    } finally {
      setLoading(false);
    }
  };

  const cambiarEstado = async (nuevoEstado) => {
    try {
      setProcesando(true);
      await ventasService.cambiarEstado(ventaId, nuevoEstado);
      toast.success(`Venta ${nuevoEstado.toLowerCase()} correctamente`);
      
      // Actualizar el estado local
      setVenta({ ...venta, estado_venta: nuevoEstado });

      // 🔥 NUEVO - Emitir evento de socket
      emitirCambioEstado(ventaId, nuevoEstado);
      console.log('✅ Evento de cambio de estado emitido via socket');
      
      // Notificar al componente padre
      if (onStatusChange) {
        onStatusChange();
      }
    } catch (error) {
      console.error('Error al cambiar estado:', error);
      toast.error(error.response?.data?.message || 'Error al cambiar estado');
    } finally {
      setProcesando(false);
    }
  };

  const handleClose = () => {
    setVenta(null);
    onHide();
  };

  const getEstadoBadge = (estado) => {
    const badges = {
      'PENDIENTE': { bg: 'warning', text: 'Pendiente' },
      'EN_PROCESO': { bg: 'info', text: 'En Proceso' },
      'COMPLETADA': { bg: 'success', text: 'Completada' },
      'CANCELADA': { bg: 'danger', text: 'Cancelada' }
    };
    return badges[estado] || { bg: 'secondary', text: estado };
  };

  const calcularSubtotal = (item) => {
    const precioBase = parseFloat(item.precio_unitario || item.precio || 0) * parseInt(item.cantidad || 0);
    const precioToppings = (item.toppings || []).reduce((sum, t) => 
      sum + (parseFloat(t.precio || t.precio_unitario || 0) * parseInt(item.cantidad || 0)), 0
    );
    return precioBase + precioToppings;
  };

  const getCodigoMoneda = () => {
    return venta?.codigo_moneda || venta?.moneda || 'USD';
  };

  const codigoMoneda = venta ? getCodigoMoneda() : 'USD';

  return (
    <Modal show={show} onHide={handleClose} size="lg" centered>
      <Modal.Header 
        closeButton 
        style={{ 
          background: 'linear-gradient(135deg, #8B4FB8 0%, #9D5BC4 100%)',
          color: 'white',
          borderBottom: 'none'
        }}
      >
        <Modal.Title>
          <i className="bi bi-receipt me-2"></i>
          Detalle de Venta {ventaId ? `#${ventaId}` : ''}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className="p-4">
        {loading ? (
          <div className="text-center py-5">
            <Spinner animation="border" style={{ color: '#8B4FB8' }} />
            <p className="mt-3 text-muted">Cargando detalle...</p>
          </div>
        ) : venta ? (
          <>
            {/* Información General */}
            <Row className="mb-4">
              <Col md={6}>
                <div className="mb-3">
                  <small className="text-muted d-block mb-1">Fecha y Hora</small>
                  <strong>{formatDateTime(venta.fecha_venta || venta.created_at)}</strong>
                </div>
                <div className="mb-3">
                  <small className="text-muted d-block mb-1">Estado</small>
                  <Badge bg={getEstadoBadge(venta.estado_venta).bg} className="fs-6">
                    {getEstadoBadge(venta.estado_venta).text}
                  </Badge>
                </div>
                {venta.nombre_cliente && (
                  <div className="mb-3">
                    <small className="text-muted d-block mb-1">
                      <i className="bi bi-person me-1"></i>
                      Cliente
                    </small>
                    <strong>{venta.nombre_cliente}</strong>
                  </div>
                )}
              </Col>
              <Col md={6}>
                <div className="mb-3">
                  <small className="text-muted d-block mb-1">Moneda de Pago</small>
                  <Badge 
                    bg="light" 
                    text="dark"
                    className="fs-6"
                    style={{ 
                      border: '2px solid rgba(139, 79, 184, 0.3)',
                      fontWeight: '600'
                    }}
                  >
                    {codigoMoneda === 'USD' && '💵 Dólares (USD)'}
                    {codigoMoneda === 'VES' && '💰 Bolívares (VES)'}
                    {codigoMoneda === 'COP' && '💵 Pesos (COP)'}
                    {!['USD', 'VES', 'COP'].includes(codigoMoneda) && codigoMoneda}
                  </Badge>
                </div>
                <div className="mb-3">
                  <small className="text-muted d-block mb-1">Número de Factura</small>
                  <strong>{venta.numero_factura || 'N/A'}</strong>
                </div>
                <div className="mb-3">
                  <small className="text-muted d-block mb-1">Atendido por</small>
                  <strong>{venta.usuario?.nombre || venta.nombre_usuario || 'N/A'}</strong>
                </div>
              </Col>
            </Row>

            {/* Items de la Venta */}
            <div className="mb-4">
              <h6 
                className="pb-2 mb-3"
                style={{ 
                  borderBottom: '2px solid rgba(139, 79, 184, 0.2)',
                  color: '#8B4FB8',
                  fontWeight: '600'
                }}
              >
                <i className="bi bi-basket me-2"></i>
                Productos
              </h6>
              <ListGroup variant="flush">
                {(venta.items || venta.detalles || []).map((item, index) => (
                  <ListGroup.Item key={index} className="px-0 py-3">
                    <Row className="align-items-start">
                      <Col xs={3} md={2}>
                        {item.imagen_url || item.imagenUrl ? (
                          <img
                            src={item.imagen_url || item.imagenUrl}
                            alt={item.nombre_producto || item.nombre}
                            className="img-fluid rounded shadow-sm"
                            style={{ maxHeight: '60px', objectFit: 'cover' }}
                          />
                        ) : (
                          <div
                            className="bg-light rounded d-flex align-items-center justify-content-center shadow-sm"
                            style={{ height: '60px' }}
                          >
                            <i className="bi bi-image text-muted"></i>
                          </div>
                        )}
                      </Col>
                      <Col xs={9} md={10}>
                        <div className="d-flex justify-content-between align-items-start flex-wrap gap-2">
                          <div className="flex-grow-1">
                            <strong className="d-block mb-1">
                              {item.nombre_producto || item.nombre}
                            </strong>
                            <small className="text-muted d-block">
                              {formatCurrency(item.precio_unitario || item.precio, codigoMoneda)} 
                              <span className="mx-1">×</span> 
                              {item.cantidad}
                            </small>
                            
                            {/* Toppings */}
                            {item.toppings && item.toppings.length > 0 && (
                              <div className="mt-2">
                                <small className="text-muted d-block mb-1">Toppings:</small>
                                {item.toppings.map((topping, idx) => (
                                  <Badge 
                                    key={idx} 
                                    bg="light" 
                                    text="dark" 
                                    className="me-1 mb-1"
                                    style={{ border: '1px solid #dee2e6' }}
                                  >
                                    <i className="bi bi-plus-circle me-1"></i>
                                    {topping.nombre_topping || topping.nombre} 
                                    <span className="ms-1">
                                      (+{formatCurrency(topping.precio || topping.precio_unitario, codigoMoneda)})
                                    </span>
                                  </Badge>
                                ))}
                              </div>
                            )}

                            {/* Sabores */}
                            {item.sabores && item.sabores.length > 0 && (
                              <div className="mt-2">
                                <small className="text-muted d-block mb-1">Sabores:</small>
                                {item.sabores.map((sabor, idx) => (
                                  <Badge 
                                    key={idx} 
                                    bg="info" 
                                    className="me-1 mb-1"
                                  >
                                    <i className="bi bi-snow2 me-1"></i>
                                    {sabor.nombre_sabor || sabor.nombre}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="text-end">
                            <strong style={{ color: '#8B4FB8', fontSize: '1.1rem' }}>
                              {formatCurrency(calcularSubtotal(item), codigoMoneda)}
                            </strong>
                          </div>
                        </div>
                      </Col>
                    </Row>
                  </ListGroup.Item>
                ))}
              </ListGroup>
            </div>

            {/* Total */}
            <div 
              className="pt-3 mt-3"
              style={{ borderTop: '2px solid rgba(139, 79, 184, 0.2)' }}
            >
              <Row className="align-items-center">
                <Col xs={12} md={6} className="mb-3 mb-md-0">
                  {codigoMoneda !== 'USD' && venta.total_usd && (
                    <div 
                      className="p-3 rounded"
                      style={{ 
                        background: 'rgba(139, 79, 184, 0.05)',
                        border: '1px solid rgba(139, 79, 184, 0.1)'
                      }}
                    >
                      <small className="text-muted d-block mb-1">
                        <i className="bi bi-currency-exchange me-1"></i>
                        Equivalente en USD:
                      </small>
                      <strong style={{ color: '#8B4FB8' }}>
                        {formatCurrency(venta.total_usd, 'USD')}
                      </strong>
                    </div>
                  )}
                </Col>
                <Col xs={12} md={6}>
                  <div className="d-flex justify-content-between align-items-center">
                    <h5 className="mb-0">Total:</h5>
                    <h3 
                      className="mb-0" 
                      style={{ 
                        color: '#28a745',
                        fontWeight: '700'
                      }}
                    >
                      {formatCurrency(venta.total || venta.monto_total, codigoMoneda)}
                    </h3>
                  </div>
                </Col>
              </Row>
            </div>

            {/* Acciones de Estado */}
            {venta.estado_venta === 'PENDIENTE' && (
              <Alert 
                variant="light"
                className="mt-4 mb-0"
                style={{ 
                  border: '2px solid rgba(139, 79, 184, 0.2)',
                  background: 'rgba(139, 79, 184, 0.05)'
                }}
              >
                <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
                  <div>
                    <i className="bi bi-info-circle me-2" style={{ color: '#8B4FB8' }}></i>
                    <strong>¿Deseas cambiar el estado de esta venta?</strong>
                  </div>
                  <div className="d-flex gap-2">
                    <Button
                      variant="info"
                      size="sm"
                      onClick={() => cambiarEstado('EN_PROCESO')}
                      disabled={procesando}
                      style={{ fontWeight: '500' }}
                    >
                      {procesando ? (
                        <Spinner animation="border" size="sm" className="me-1" />
                      ) : (
                        <i className="bi bi-hourglass-split me-1"></i>
                      )}
                      En Proceso
                    </Button>
                    <Button
                      variant="success"
                      size="sm"
                      onClick={() => cambiarEstado('COMPLETADA')}
                      disabled={procesando}
                      style={{ fontWeight: '500' }}
                    >
                      {procesando ? (
                        <Spinner animation="border" size="sm" className="me-1" />
                      ) : (
                        <i className="bi bi-check-circle me-1"></i>
                      )}
                      Completar
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => cambiarEstado('CANCELADA')}
                      disabled={procesando}
                      style={{ fontWeight: '500' }}
                    >
                      <i className="bi bi-x-circle me-1"></i>
                      Cancelar
                    </Button>
                  </div>
                </div>
              </Alert>
            )}

            {/* 🔥 NUEVO - Acciones adicionales para EN_PROCESO */}
            {venta.estado_venta === 'EN_PROCESO' && (
              <Alert 
                variant="light"
                className="mt-4 mb-0"
                style={{ 
                  border: '2px solid rgba(23, 162, 184, 0.2)',
                  background: 'rgba(23, 162, 184, 0.05)'
                }}
              >
                <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
                  <div>
                    <i className="bi bi-hourglass-split me-2" style={{ color: '#17a2b8' }}></i>
                    <strong>Pedido en preparación</strong>
                  </div>
                  <div className="d-flex gap-2">
                    <Button
                      variant="success"
                      size="sm"
                      onClick={() => cambiarEstado('COMPLETADA')}
                      disabled={procesando}
                      style={{ fontWeight: '500' }}
                    >
                      {procesando ? (
                        <Spinner animation="border" size="sm" className="me-1" />
                      ) : (
                        <i className="bi bi-check-circle me-1"></i>
                      )}
                      Marcar como Completado
                    </Button>
                  </div>
                </div>
              </Alert>
            )}
          </>
        ) : (
          <Alert variant="warning">
            <i className="bi bi-exclamation-triangle me-2"></i>
            No se pudo cargar la información de la venta
          </Alert>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button 
          variant="secondary" 
          onClick={handleClose}
          style={{ fontWeight: '500' }}
        >
          <i className="bi bi-x-lg me-2"></i>
          Cerrar
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default DetalleVentaModal;