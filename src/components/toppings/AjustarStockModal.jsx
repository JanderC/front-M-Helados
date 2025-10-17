import { useState } from 'react';
import { Modal, Form, Button, Alert } from 'react-bootstrap';
import { toppingsService } from '../../api/services/toppingsService';
import { toast } from 'react-toastify';

const AjustarStockModal = ({ show, onHide, topping, onSuccess }) => {
  const [formData, setFormData] = useState({
    tipo_movimiento: 'ENTRADA',
    cantidad: '',
    motivo: ''
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.cantidad || formData.cantidad <= 0) {
      toast.error('La cantidad debe ser mayor a 0');
      return;
    }

    try {
      setLoading(true);
      await toppingsService.ajustarStock(
        topping.id_topping,
        {
          tipo_movimiento: formData.tipo_movimiento,
          cantidad: parseInt(formData.cantidad),
          motivo: formData.motivo.trim()
        }
      );
      toast.success('Stock ajustado correctamente');
      onSuccess();
      resetForm();
    } catch (error) {
      console.error('Error al ajustar stock:', error);
      toast.error(error.response?.data?.message || 'Error al ajustar stock');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      tipo_movimiento: 'ENTRADA',
      cantidad: '',
      motivo: ''
    });
  };

  const handleClose = () => {
    resetForm();
    onHide();
  };

  if (!topping) return null;

  const calcularNuevoStock = () => {
    const cantidad = parseInt(formData.cantidad) || 0;
    if (formData.tipo_movimiento === 'ENTRADA') {
      return topping.stock_actual + cantidad;
    } else if (formData.tipo_movimiento === 'SALIDA') {
      return topping.stock_actual - cantidad;
    } else {
      return cantidad; // AJUSTE establece el stock exacto
    }
  };

  const nuevoStock = calcularNuevoStock();

  return (
    <Modal show={show} onHide={handleClose} centered>
      <Modal.Header closeButton>
        <Modal.Title>
          <i className="bi bi-arrow-repeat me-2"></i>
          Ajustar Stock - {topping.nombre_topping}
        </Modal.Title>
      </Modal.Header>
      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          <Alert variant="info">
            <strong>Stock actual:</strong> {topping.stock_actual} {topping.unidad_medida}
          </Alert>

          <Form.Group className="mb-3">
            <Form.Label>Tipo de Movimiento *</Form.Label>
            <Form.Select
              name="tipo_movimiento"
              value={formData.tipo_movimiento}
              onChange={handleChange}
              disabled={loading}
            >
              <option value="ENTRADA">Entrada (Agregar stock)</option>
              <option value="SALIDA">Salida (Restar stock)</option>
              <option value="AJUSTE">Ajuste (Establecer stock exacto)</option>
            </Form.Select>
            <Form.Text className="text-muted">
              {formData.tipo_movimiento === 'ENTRADA' && 'Suma al stock actual'}
              {formData.tipo_movimiento === 'SALIDA' && 'Resta del stock actual'}
              {formData.tipo_movimiento === 'AJUSTE' && 'Establece el stock en el valor indicado'}
            </Form.Text>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>
              {formData.tipo_movimiento === 'AJUSTE' ? 'Nuevo Stock *' : 'Cantidad *'}
            </Form.Label>
            <Form.Control
              type="number"
              name="cantidad"
              value={formData.cantidad}
              onChange={handleChange}
              disabled={loading}
              placeholder="0"
              min="0"
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Motivo *</Form.Label>
            <Form.Control
              as="textarea"
              rows={2}
              name="motivo"
              value={formData.motivo}
              onChange={handleChange}
              disabled={loading}
              placeholder="Ej: Compra de mercancía, Ajuste por conteo físico, Merma..."
              required
            />
          </Form.Group>

          {formData.cantidad && (
            <Alert variant={nuevoStock >= 0 ? 'success' : 'danger'}>
              <strong>Nuevo stock:</strong> {nuevoStock} {topping.unidad_medida}
              {nuevoStock < 0 && (
                <div className="mt-2">
                  <i className="bi bi-exclamation-triangle me-2"></i>
                  El stock no puede ser negativo
                </div>
              )}
            </Alert>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleClose} disabled={loading}>
            Cancelar
          </Button>
          <Button 
            variant="primary" 
            type="submit" 
            disabled={loading || nuevoStock < 0}
          >
            {loading ? 'Ajustando...' : 'Ajustar Stock'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default AjustarStockModal;