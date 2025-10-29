import { useState } from 'react';
import { Modal, Form, Button, Alert } from 'react-bootstrap';
import { cajaService } from '../../api/services/cajaService';
import { toast } from 'react-toastify';

const AbrirCajaModal = ({ show, onHide, onSuccess }) => {
  const [formData, setFormData] = useState({
    montoInicial: '',
    moneda: 'COP' // Por defecto COP (Pesos Colombianos)
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

    if (!formData.montoInicial || parseFloat(formData.montoInicial) < 0) {
      setError('El monto inicial debe ser mayor o igual a 0');
      return;
    }

    try {
      setLoading(true);
      await cajaService.abrir(parseFloat(formData.montoInicial), formData.moneda);
      toast.success('✅ Caja abierta correctamente');
      onSuccess();
      handleClose();
    } catch (error) {
      console.error('Error al abrir caja:', error);
      const mensajeError = error.response?.data?.message || 'Error al abrir caja';
      setError(mensajeError);
      toast.error(mensajeError);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      montoInicial: '',
      moneda: 'COP'
    });
    setError('');
    onHide();
  };

  return (
    <Modal show={show} onHide={handleClose} centered>
      <Modal.Header closeButton>
        <Modal.Title>
          <i className="bi bi-unlock me-2"></i>
          Abrir Caja
        </Modal.Title>
      </Modal.Header>
      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          {error && <Alert variant="danger">{error}</Alert>}

          <Alert variant="info">
            <i className="bi bi-info-circle me-2"></i>
            Ingresa el monto inicial en efectivo con el que comenzará la caja del día.
          </Alert>

          <Form.Group className="mb-3">
            <Form.Label>Moneda Base *</Form.Label>
            <Form.Select
              name="moneda"
              value={formData.moneda}
              onChange={handleChange}
              disabled={loading}
            >
              <option value="COP">COP - Peso Colombiano</option>
              <option value="USD">USD - Dólar</option>
              <option value="VES">VES - Bolívar</option>
            </Form.Select>
            <Form.Text className="text-muted">
              Selecciona la moneda principal con la que trabajarás hoy
            </Form.Text>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Monto Inicial ({formData.moneda}) *</Form.Label>
            <Form.Control
              type="number"
              step="0.01"
              name="montoInicial"
              value={formData.montoInicial}
              onChange={handleChange}
              placeholder="0.00"
              disabled={loading}
              required
              min="0"
            />
            <Form.Text className="text-muted">
              Este será el monto de apertura de la caja en efectivo
            </Form.Text>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleClose} disabled={loading}>
            Cancelar
          </Button>
          <Button variant="success" type="submit" disabled={loading}>
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Abriendo...
              </>
            ) : (
              <>
                <i className="bi bi-unlock me-2"></i>
                Abrir Caja
              </>
            )}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default AbrirCajaModal;