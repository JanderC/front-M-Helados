import { useState, useEffect } from 'react';
import { Modal, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { monedasService } from '../../api/services/monedasService';
import { toast } from 'react-toastify';

const EditarTasaModal = ({ show, onHide, tasa, onSuccess }) => {
  const [formData, setFormData] = useState({
    tasa_cambio_usd: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (tasa) {
      setFormData({
        tasa_cambio_usd: tasa.tasa_cambio_usd || ''
      });
    }
  }, [tasa]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.tasa_cambio_usd || formData.tasa_cambio_usd <= 0) {
      setError('La tasa debe ser mayor a 0');
      return;
    }

    try {
      setLoading(true);
      await monedasService.actualizarManual(
        tasa.codigo_moneda,
        parseFloat(formData.tasa_cambio_usd)
      );
      toast.success('Tasa actualizada correctamente');
      onSuccess();
      handleClose();
    } catch (error) {
      console.error('Error al actualizar tasa:', error);
      setError(error.response?.data?.message || 'Error al actualizar tasa');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      tasa_cambio_usd: ''
    });
    setError('');
    onHide();
  };

  // Si no hay tasa seleccionada, no renderizar
  if (!tasa) return null;

  return (
    <Modal show={show} onHide={handleClose} centered>
      <Modal.Header 
        closeButton 
        style={{ 
          background: 'linear-gradient(135deg, rgba(139, 79, 184, 0.1) 0%, rgba(157, 91, 196, 0.1) 100%)',
          borderBottom: '2px solid rgba(139, 79, 184, 0.2)'
        }}
      >
        <Modal.Title style={{ color: '#8B4FB8', fontWeight: '700' }}>
          <i className="bi bi-pencil-square me-2"></i>
          Editar Tasa - {tasa.codigo_moneda}
        </Modal.Title>
      </Modal.Header>
      <Form onSubmit={handleSubmit}>
        <Modal.Body className="p-4">
          {error && <Alert variant="danger">{error}</Alert>}

          <Alert 
            variant="light"
            style={{ 
              borderLeft: '4px solid #8B4FB8',
              background: 'rgba(139, 79, 184, 0.05)'
            }}
          >
            <i className="bi bi-info-circle me-2" style={{ color: '#8B4FB8' }}></i>
            Ingrese cuántas unidades de <strong>{tasa.codigo_moneda}</strong> equivalen a 1 USD.
          </Alert>

          <Form.Group className="mb-3">
            <Form.Label className="fw-bold">
              Tasa de Cambio *
              <br />
              <small className="text-muted fw-normal">1 USD = ? {tasa.codigo_moneda}</small>
            </Form.Label>
            <div className="input-group">
              <span className="input-group-text">{tasa.simbolo || tasa.codigo_moneda}</span>
              <Form.Control
                type="number"
                step="0.01"
                name="tasa_cambio_usd"
                value={formData.tasa_cambio_usd}
                onChange={handleChange}
                placeholder="Ej: 4000"
                disabled={loading}
                required
              />
            </div>
            {formData.tasa_cambio_usd > 0 && (
              <Form.Text className="text-muted">
                Equivalencia: 1 {tasa.codigo_moneda} = ${(1 / parseFloat(formData.tasa_cambio_usd)).toFixed(6)} USD
              </Form.Text>
            )}
          </Form.Group>

          <Alert variant="warning" className="mb-0">
            <small>
              <i className="bi bi-exclamation-triangle me-2"></i>
              Esta tasa se aplicará a todas las conversiones y cálculos del sistema.
            </small>
          </Alert>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleClose} disabled={loading}>
            Cancelar
          </Button>
          <Button 
            type="submit" 
            disabled={loading}
            style={{ 
              background: 'linear-gradient(135deg, #8B4FB8 0%, #9D5BC4 100%)',
              border: 'none',
              fontWeight: '500'
            }}
          >
            {loading ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Guardando...
              </>
            ) : (
              'Guardar Tasa'
            )}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default EditarTasaModal;