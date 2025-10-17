import { useState } from 'react';
import { Modal, Form, Button, Alert, Table } from 'react-bootstrap';
import { cajaService } from '../../api/services/cajaService';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { toast } from 'react-toastify';

const CerrarCajaModal = ({ show, onHide, estadoCaja, onSuccess }) => {
  const [formData, setFormData] = useState({
    montoFinal: '',
    observaciones: ''
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

    if (!formData.montoFinal || formData.montoFinal < 0) {
      setError('El monto final debe ser mayor o igual a 0');
      return;
    }

    try {
      setLoading(true);
      await cajaService.cerrar(parseFloat(formData.montoFinal), formData.observaciones);
      toast.success('Caja cerrada correctamente');
      onSuccess();
      handleClose();
    } catch (error) {
      console.error('Error al cerrar caja:', error);
      setError(error.response?.data?.message || 'Error al cerrar caja');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      montoFinal: '',
      observaciones: ''
    });
    setError('');
    onHide();
  };

  if (!estadoCaja) return null;

  const diferencia = formData.montoFinal ? 
    parseFloat(formData.montoFinal) - (estadoCaja.montoEsperado || estadoCaja.montoInicial) : 0;

  return (
    <Modal show={show} onHide={handleClose} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title>
          <i className="bi bi-lock me-2"></i>
          Cerrar Caja
        </Modal.Title>
      </Modal.Header>
      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          {error && <Alert variant="danger">{error}</Alert>}

          <Alert variant="warning">
            <i className="bi bi-exclamation-triangle me-2"></i>
            Al cerrar la caja se realizará el arqueo y no podrás realizar más transacciones hasta abrir una nueva caja.
          </Alert>

          {/* Información de la caja */}
          <Table bordered size="sm" className="mb-4">
            <tbody>
              <tr>
                <td className="bg-light"><strong>Fecha de Apertura:</strong></td>
                <td>{formatDateTime(estadoCaja.fechaApertura)}</td>
              </tr>
              <tr>
                <td className="bg-light"><strong>Monto Inicial:</strong></td>
                <td>{formatCurrency(estadoCaja.montoInicial, estadoCaja.moneda)}</td>
              </tr>
              <tr>
                <td className="bg-light"><strong>Monto Esperado:</strong></td>
                <td className="fw-bold text-primary">
                  {formatCurrency(estadoCaja.montoEsperado || estadoCaja.montoInicial, estadoCaja.moneda)}
                </td>
              </tr>
            </tbody>
          </Table>

          <Form.Group className="mb-3">
            <Form.Label>Monto Final en Caja * ({estadoCaja.moneda})</Form.Label>
            <Form.Control
              type="number"
              step="0.01"
              name="montoFinal"
              value={formData.montoFinal}
              onChange={handleChange}
              placeholder="0.00"
              disabled={loading}
              required
            />
            <Form.Text className="text-muted">
              Ingresa el monto real que hay en la caja al finalizar el día
            </Form.Text>
          </Form.Group>

          {formData.montoFinal && (
            <Alert variant={diferencia === 0 ? 'success' : diferencia > 0 ? 'info' : 'danger'}>
              <strong>Diferencia: </strong>
              {diferencia === 0 ? (
                <span className="text-success">Caja cuadrada ✓</span>
              ) : (
                <span>
                  {formatCurrency(Math.abs(diferencia), estadoCaja.moneda)} 
                  {diferencia > 0 ? ' (Sobrante)' : ' (Faltante)'}
                </span>
              )}
            </Alert>
          )}

          <Form.Group className="mb-3">
            <Form.Label>Observaciones</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              name="observaciones"
              value={formData.observaciones}
              onChange={handleChange}
              disabled={loading}
              placeholder="Notas sobre el cierre de caja, discrepancias, etc..."
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleClose} disabled={loading}>
            Cancelar
          </Button>
          <Button variant="danger" type="submit" disabled={loading}>
            {loading ? 'Cerrando...' : 'Cerrar Caja'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default CerrarCajaModal;