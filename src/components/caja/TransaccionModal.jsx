import { useState } from 'react';
import { Modal, Form, Button, Alert } from 'react-bootstrap';
import { cajaService } from '../../api/services/cajaService';
import { toast } from 'react-toastify';

const TransaccionModal = ({ show, onHide, onSuccess }) => {
  const [formData, setFormData] = useState({
    tipo: 'INGRESO',
    monto: '',
    moneda: 'USD',
    concepto: '',
    descripcion: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.monto || formData.monto <= 0) {
      setError('El monto debe ser mayor a 0');
      return;
    }

    if (!formData.concepto.trim()) {
      setError('El concepto es requerido');
      return;
    }

    try {
      setLoading(true);
      const data = {
        ...formData,
        monto: parseFloat(formData.monto)
      };
      
      await cajaService.registrarTransaccion(data);
      toast.success('Transacción registrada correctamente');
      onSuccess();
      handleClose();
    } catch (error) {
      console.error('Error al registrar transacción:', error);
      setError(error.response?.data?.message || 'Error al registrar transacción');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      tipo: 'INGRESO',
      monto: '',
      moneda: 'USD',
      concepto: '',
      descripcion: ''
    });
    setError('');
    onHide();
  };

  return (
    <Modal show={show} onHide={handleClose} centered>
      <Modal.Header closeButton>
        <Modal.Title>
          <i className="bi bi-plus-circle me-2"></i>
          Nueva Transacción
        </Modal.Title>
      </Modal.Header>
      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          {error && <Alert variant="danger">{error}</Alert>}

          <Alert variant="info" className="small">
            <i className="bi bi-info-circle me-2"></i>
            Registra ingresos o egresos manuales en la caja (gastos, retiros, ingresos adicionales, etc.)
          </Alert>

          <Form.Group className="mb-3">
            <Form.Label>Tipo de Transacción *</Form.Label>
            <Form.Select
              name="tipo"
              value={formData.tipo}
              onChange={handleChange}
              disabled={loading}
            >
              <option value="INGRESO">Ingreso (+)</option>
              <option value="EGRESO">Egreso (-)</option>
            </Form.Select>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Moneda *</Form.Label>
            <Form.Select
              name="moneda"
              value={formData.moneda}
              onChange={handleChange}
              disabled={loading}
            >
              <option value="USD">USD - Dólar</option>
              <option value="VES">VES - Bolívar</option>
              <option value="COP">COP - Peso Colombiano</option>
            </Form.Select>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Monto *</Form.Label>
            <Form.Control
              type="number"
              step="0.01"
              name="monto"
              value={formData.monto}
              onChange={handleChange}
              placeholder="0.00"
              disabled={loading}
              required
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Concepto *</Form.Label>
            <Form.Control
              type="text"
              name="concepto"
              value={formData.concepto}
              onChange={handleChange}
              placeholder="Ej: Pago de servicios, Compra de insumos..."
              disabled={loading}
              required
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Descripción</Form.Label>
            <Form.Control
              as="textarea"
              rows={2}
              name="descripcion"
              value={formData.descripcion}
              onChange={handleChange}
              disabled={loading}
              placeholder="Detalles adicionales..."
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleClose} disabled={loading}>
            Cancelar
          </Button>
          <Button variant="primary" type="submit" disabled={loading}>
            {loading ? 'Guardando...' : 'Registrar Transacción'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default TransaccionModal;