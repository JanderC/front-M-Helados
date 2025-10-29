import { useState, useEffect } from 'react';
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

  // Determinar la moneda principal de la caja
  const getMonedaPrincipal = () => {
    if (!estadoCaja) return 'COP';
    
    if (parseFloat(estadoCaja.monto_inicial_cop || 0) > 0) return 'COP';
    if (parseFloat(estadoCaja.monto_inicial_usd || 0) > 0) return 'USD';
    if (parseFloat(estadoCaja.monto_inicial_ves || 0) > 0) return 'VES';
    return 'COP';
  };

  const monedaPrincipal = getMonedaPrincipal();

  // Obtener monto inicial según la moneda
  const getMontoInicial = () => {
    if (!estadoCaja) return 0;
    
    switch (monedaPrincipal) {
      case 'USD':
        return parseFloat(estadoCaja.monto_inicial_usd || 0);
      case 'VES':
        return parseFloat(estadoCaja.monto_inicial_ves || 0);
      case 'COP':
      default:
        return parseFloat(estadoCaja.monto_inicial_cop || 0);
    }
  };

  const montoInicial = getMontoInicial();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.montoFinal || parseFloat(formData.montoFinal) < 0) {
      setError('El monto final debe ser mayor o igual a 0');
      return;
    }

    try {
      setLoading(true);
      await cajaService.cerrar(
        parseFloat(formData.montoFinal), 
        monedaPrincipal, 
        formData.observaciones
      );
      toast.success('✅ Caja cerrada correctamente');
      onSuccess();
      handleClose();
    } catch (error) {
      console.error('Error al cerrar caja:', error);
      const mensajeError = error.response?.data?.message || 'Error al cerrar caja';
      setError(mensajeError);
      toast.error(mensajeError);
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

  // Calcular ventas esperadas según la moneda
  const ventasEsperadas = parseFloat(estadoCaja.ventas_dia?.total_usd || 0);
  const montoEsperado = montoInicial + ventasEsperadas;
  
  const diferencia = formData.montoFinal ? 
    parseFloat(formData.montoFinal) - montoEsperado : 0;

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
                <td>{formatDateTime(estadoCaja.fecha_apertura)}</td>
              </tr>
              <tr>
                <td className="bg-light"><strong>Responsable:</strong></td>
                <td>{estadoCaja.usuario_apertura || 'N/A'}</td>
              </tr>
              <tr>
                <td className="bg-light"><strong>Moneda de Trabajo:</strong></td>
                <td>
                  <span className="badge bg-primary">{monedaPrincipal}</span>
                </td>
              </tr>
              <tr>
                <td className="bg-light"><strong>Monto Inicial:</strong></td>
                <td>{formatCurrency(montoInicial, monedaPrincipal)}</td>
              </tr>
              <tr>
                <td className="bg-light"><strong>Ventas del Día (USD):</strong></td>
                <td className="text-success fw-bold">
                  {formatCurrency(ventasEsperadas, 'USD')}
                </td>
              </tr>
              <tr>
                <td className="bg-light"><strong>Total Ventas:</strong></td>
                <td className="text-info fw-bold">
                  {estadoCaja.ventas_dia?.total_ventas || 0} ventas
                </td>
              </tr>
              <tr>
                <td className="bg-light"><strong>Monto Esperado:</strong></td>
                <td className="fw-bold text-primary">
                  {formatCurrency(montoEsperado, monedaPrincipal)}
                </td>
              </tr>
            </tbody>
          </Table>

          <Form.Group className="mb-3">
            <Form.Label>Monto Final en Caja ({monedaPrincipal}) *</Form.Label>
            <Form.Control
              type="number"
              step="0.01"
              name="montoFinal"
              value={formData.montoFinal}
              onChange={handleChange}
              placeholder="0.00"
              disabled={loading}
              required
              min="0"
            />
            <Form.Text className="text-muted">
              Ingresa el monto real que hay en la caja al finalizar el día (efectivo)
            </Form.Text>
          </Form.Group>

          {formData.montoFinal && (
            <Alert variant={diferencia === 0 ? 'success' : diferencia > 0 ? 'info' : 'danger'}>
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <strong>Diferencia: </strong>
                  {diferencia === 0 ? (
                    <span className="text-success">
                      <i className="bi bi-check-circle-fill me-1"></i>
                      Caja cuadrada ✓
                    </span>
                  ) : (
                    <span>
                      {formatCurrency(Math.abs(diferencia), monedaPrincipal)} 
                      {diferencia > 0 ? ' (Sobrante)' : ' (Faltante)'}
                    </span>
                  )}
                </div>
                {diferencia !== 0 && (
                  <i className={`bi ${diferencia > 0 ? 'bi-arrow-up-circle' : 'bi-arrow-down-circle'} fs-4`}></i>
                )}
              </div>
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
              placeholder="Notas sobre el cierre de caja, discrepancias, incidentes, etc..."
            />
            {diferencia !== 0 && (
              <Form.Text className="text-warning">
                <i className="bi bi-exclamation-triangle me-1"></i>
                Se recomienda documentar la razón de la diferencia
              </Form.Text>
            )}
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleClose} disabled={loading}>
            Cancelar
          </Button>
          <Button variant="danger" type="submit" disabled={loading}>
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Cerrando...
              </>
            ) : (
              <>
                <i className="bi bi-lock me-2"></i>
                Cerrar Caja
              </>
            )}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default CerrarCajaModal;