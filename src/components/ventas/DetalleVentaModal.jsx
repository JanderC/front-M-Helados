import { useState } from 'react';
import { Modal, Table, Badge, Button, Form } from 'react-bootstrap';
import { ventasService } from '../../api/services/ventasService';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { COLORES_ESTADO } from '../../utils/constants';
import { toast } from 'react-toastify';

const DetalleVentaModal = ({ show, onHide, venta, onEstadoChange }) => {
  const [cambiandoEstado, setCambiandoEstado] = useState(false);
  const [nuevoEstado, setNuevoEstado] = useState('');

  if (!venta) return null;

  const handleCambiarEstado = async () => {
    if (!nuevoEstado) {
      toast.error('Selecciona un estado');
      return;
    }

    try {
      setCambiandoEstado(true);
      const response = await ventasService.cambiarEstado(venta.id_venta, nuevoEstado);
      
      if (response.data.success) {
        toast.success(response.data.message || 'Estado actualizado correctamente');
        onEstadoChange();
      }
    } catch (error) {
      console.error('Error al cambiar estado:', error);
      toast.error(error.response?.data?.message || 'Error al cambiar estado');
    } finally {
      setCambiandoEstado(false);
    }
  };

  const calcularSubtotalDetalle = (detalle) => {
    const subtotalProducto = parseFloat(detalle.subtotal || 0);
    return subtotalProducto;
  };

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title>
          <i className="bi bi-receipt me-2"></i>
          Detalle de Venta - {venta.numero_factura}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {/* Información general */}
        <div className="mb-4">
          <div className="row mb-2">
            <div className="col-6">
              <strong>Fecha:</strong> {formatDateTime(venta.fecha_venta)}
            </div>
            <div className="col-6 text-end">
              <Badge bg={COLORES_ESTADO[venta.estado_venta] || 'secondary'} className="fs-6">
                {venta.estado_venta}
              </Badge>
            </div>
          </div>
          <div className="row mb-2">
            <div className="col-6">
              <strong>Usuario:</strong> {venta.nombre_usuario || '-'}
            </div>
            <div className="col-6 text-end">
              <strong>Cliente:</strong> {venta.nombre_cliente || 'Cliente General'}
            </div>
          </div>
          <div className="row mb-2">
            <div className="col-6">
              <strong>Moneda:</strong> {venta.codigo_moneda} ({venta.simbolo})
            </div>
            <div className="col-6 text-end">
              <strong>Método Pago:</strong> {venta.metodo_pago || '-'}
            </div>
          </div>
          {venta.notas && (
            <div className="row">
              <div className="col-12">
                <strong>Notas:</strong> <span className="text-muted">{venta.notas}</span>
              </div>
            </div>
          )}
        </div>

        {/* Detalles de productos */}
        <h6 className="mb-3">Productos</h6>
        <Table size="sm" className="mb-4">
          <thead className="table-light">
            <tr>
              <th>Producto</th>
              <th className="text-center">Cant.</th>
              <th className="text-end">Precio Unit.</th>
              <th className="text-end">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {venta.detalles?.map((detalle, index) => (
              <tr key={detalle.id_detalle_venta || index}>
                <td>
                  <div className="fw-medium">{detalle.nombre_producto}</div>
                  {detalle.toppings?.length > 0 && (
                    <div className="small text-muted">
                      Toppings: {detalle.toppings.map(t => 
                        `${t.nombre_topping} (+${formatCurrency(t.precio_adicional, venta.codigo_moneda)})`
                      ).join(', ')}
                    </div>
                  )}
                </td>
                <td className="text-center">{detalle.cantidad}</td>
                <td className="text-end">{formatCurrency(detalle.precio_unitario, venta.codigo_moneda)}</td>
                <td className="text-end fw-bold">
                  {formatCurrency(calcularSubtotalDetalle(detalle), venta.codigo_moneda)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="table-light">
              <td colSpan="3" className="text-end fw-bold">SUBTOTAL:</td>
              <td className="text-end fw-bold">{formatCurrency(venta.subtotal, venta.codigo_moneda)}</td>
            </tr>
            <tr className="table-light">
              <td colSpan="3" className="text-end fw-bold">TOTAL:</td>
              <td className="text-end fw-bold text-success fs-5">
                {formatCurrency(venta.total, venta.codigo_moneda)}
              </td>
            </tr>
          </tfoot>
        </Table>

        {/* Cambiar estado */}
        {venta.estado_venta !== 'COMPLETADA' && venta.estado_venta !== 'CANCELADA' && (
          <div className="border-top pt-3">
            <h6 className="mb-3">Cambiar Estado</h6>
            <Form.Group className="mb-3">
              <Form.Label>Nuevo Estado</Form.Label>
              <Form.Select
                value={nuevoEstado}
                onChange={(e) => setNuevoEstado(e.target.value)}
                disabled={cambiandoEstado}
              >
                <option value="">Seleccionar...</option>
                <option value="EN_PROCESO">EN PROCESO</option>
                <option value="COMPLETADA">COMPLETADA</option>
                <option value="CANCELADA">CANCELADA</option>
                <option value="DEVUELTA">DEVUELTA</option>
              </Form.Select>
            </Form.Group>

            <Button
              variant="primary"
              onClick={handleCambiarEstado}
              disabled={cambiandoEstado || !nuevoEstado}
              className="w-100"
            >
              {cambiandoEstado ? 'Actualizando...' : 'Actualizar Estado'}
            </Button>
          </div>
        )}
      </Modal.Body>
    </Modal>
  );
};

export default DetalleVentaModal;