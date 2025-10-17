import { useState, useEffect } from 'react';
import { Modal, Button, Badge, ListGroup, Row, Col, Spinner, Alert } from 'react-bootstrap';
import { ventasService } from '../../api/services/ventasService';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { toast } from 'react-toastify';

const DetalleVentaModal = ({ show, onHide, ventaId, onStatusChange }) => {
  const [venta, setVenta] = useState(null);
  const [loading, setLoading] = useState(false);
  const [procesando, setProcesando] = useState(false);

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
      'COMPLETADA': { bg: 'success', text: 'Completada' },
      'CANCELADA': { bg: 'danger', text: 'Cancelada' }
    };
    return badges[estado] || { bg: 'secondary', text: estado };
  };

  const calcularSubtotal = (item) => {
    const precioBase = parseFloat(item.precio_unitario || item.precio || 0) * parseInt(item.cantidad || 0);
    const precioToppings = (item.toppings || []).reduce((sum, t) => 
      sum + (parseFloat(t.precio || 0) * parseInt(item.cantidad || 0)), 0
    );
    return precioBase + precioToppings;
  };

  if (!show) return null;

  return (
    <Modal show={show} onHide={handleClose} size="lg" centered>
      <Modal.Header closeButton className="bg-primary text-white">
        <Modal.Title>
          <i className="bi bi-receipt me-2"></i>
          Detalle de Venta #{ventaId}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {loading ? (
          <div className="text-center py-5">
            <Spinner animation="border" variant="primary" />
            <p className="mt-3 text-muted">Cargando detalle...</p>
          </div>
        ) : venta ? (
          <>
            {/* Información General */}
            <Row className="mb-4">
              <Col md={6}>
                <div className="mb-3">
                  <small className="text-muted d-block">Fecha y Hora</small>
                  <strong>{formatDateTime(venta.fecha_venta || venta.created_at)}</strong>
                </div>
                <div className="mb-3">
                  <small className="text-muted d-block">Estado</small>
                  <Badge bg={getEstadoBadge(venta.estado_venta).bg} className="fs-6">
                    {getEstadoBadge(venta.estado_venta).text}
                  </Badge>
                </div>
              </Col>
              <Col md={6}>
                <div className="mb-3">
                  <small className="text-muted d-block">Moneda</small>
                  <strong>{venta.codigo_moneda || venta.moneda || 'USD'}</strong>
                </div>
                <div className="mb-3">
                  <small className="text-muted d-block">Atendido por</small>
                  <strong>{venta.usuario?.nombre || venta.nombre_usuario || 'N/A'}</strong>
                </div>
              </Col>
            </Row>

            {/* Items de la Venta */}
            <div className="mb-4">
              <h6 className="border-bottom pb-2 mb-3">
                <i className="bi bi-basket me-2"></i>
                Productos
              </h6>
              <ListGroup variant="flush">
                {(venta.items || venta.detalles || []).map((item, index) => (
                  <ListGroup.Item key={index} className="px-0">
                    <Row className="align-items-start">
                      <Col md={2}>
                        {item.imagen_url || item.imagenUrl ? (
                          <img
                            src={item.imagen_url || item.imagenUrl}
                            alt={item.nombre_producto || item.nombre}
                            className="img-fluid rounded"
                            style={{ maxHeight: '60px', objectFit: 'cover' }}
                          />
                        ) : (
                          <div
                            className="bg-light rounded d-flex align-items-center justify-content-center"
                            style={{ height: '60px' }}
                          >
                            <i className="bi bi-image text-muted"></i>
                          </div>
                        )}
                      </Col>
                      <Col md={10}>
                        <div className="d-flex justify-content-between align-items-start">
                          <div>
                            <strong className="d-block">
                              {item.nombre_producto || item.nombre}
                            </strong>
                            <small className="text-muted">
                              {formatCurrency(item.precio_unitario || item.precio, venta.codigo_moneda || 'USD')} x {item.cantidad}
                            </small>
                            
                            {/* Toppings */}
                            {item.toppings && item.toppings.length > 0 && (
                              <div className="mt-1">
                                {item.toppings.map((topping, idx) => (
                                  <Badge key={idx} bg="secondary" className="me-1">
                                    + {topping.nombre_topping || topping.nombre} 
                                    ({formatCurrency(topping.precio, venta.codigo_moneda || 'USD')})
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="text-end">
                            <strong className="text-primary">
                              {formatCurrency(calcularSubtotal(item), venta.codigo_moneda || 'USD')}
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
            <div className="border-top pt-3">
              <Row>
                <Col md={6}>
                  {venta.codigo_moneda !== 'USD' && venta.total_usd && (
                    <div className="text-muted small">
                      <i className="bi bi-info-circle me-1"></i>
                      Equivalente: {formatCurrency(venta.total_usd, 'USD')}
                    </div>
                  )}
                </Col>
                <Col md={6}>
                  <div className="d-flex justify-content-between align-items-center">
                    <h5 className="mb-0">Total:</h5>
                    <h4 className="mb-0 text-success">
                      {formatCurrency(venta.total || venta.monto_total, venta.codigo_moneda || 'USD')}
                    </h4>
                  </div>
                </Col>
              </Row>
            </div>

            {/* Acciones de Estado */}
            {venta.estado_venta === 'PENDIENTE' && (
              <Alert variant="info" className="mt-4 mb-0">
                <div className="d-flex justify-content-between align-items-center flex-wrap">
                  <div className="mb-2 mb-md-0">
                    <i className="bi bi-info-circle me-2"></i>
                    <strong>¿Deseas cambiar el estado de esta venta?</strong>
                  </div>
                  <div>
                    <Button
                      variant="success"
                      size="sm"
                      className="me-2"
                      onClick={() => cambiarEstado('COMPLETADA')}
                      disabled={procesando}
                    >
                      <i className="bi bi-check-circle me-1"></i>
                      Completar
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => cambiarEstado('CANCELADA')}
                      disabled={procesando}
                    >
                      <i className="bi bi-x-circle me-1"></i>
                      Cancelar
                    </Button>
                  </div>
                </div>
              </Alert>
            )}
          </>
        ) : (
          <Alert variant="warning">No se pudo cargar la información de la venta</Alert>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose}>
          Cerrar
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default DetalleVentaModal;