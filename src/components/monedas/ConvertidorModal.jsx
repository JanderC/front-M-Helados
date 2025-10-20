import { useState } from 'react';
import { Modal, Form, Button, Alert, Row, Col, Badge, Spinner } from 'react-bootstrap';
import { monedasService } from '../../api/services/monedasService';
import { formatCurrency } from '../../utils/formatters';
import { toast } from 'react-toastify';

const ConvertidorModal = ({ show, onHide, tasas }) => {
  const [formData, setFormData] = useState({
    monto: '',
    moneda_origen: 'USD',
    moneda_destino: 'VES'
  });
  const [resultado, setResultado] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setResultado(null);
  };

  const handleConvertir = async (e) => {
    e.preventDefault();

    if (!formData.monto || formData.monto <= 0) {
      toast.error('El monto debe ser mayor a 0');
      return;
    }

    if (formData.moneda_origen === formData.moneda_destino) {
      toast.error('Debe seleccionar monedas diferentes');
      return;
    }

    try {
      setLoading(true);
      const response = await monedasService.convertir(
        parseFloat(formData.monto),
        formData.moneda_origen,
        formData.moneda_destino
      );

      setResultado(response.data?.data || response.data);
    } catch (error) {
      console.error('Error al convertir:', error);
      toast.error('Error al realizar la conversión');
    } finally {
      setLoading(false);
    }
  };

  const handleIntercambiar = () => {
    setFormData({
      ...formData,
      moneda_origen: formData.moneda_destino,
      moneda_destino: formData.moneda_origen
    });
    setResultado(null);
  };

  const handleClose = () => {
    setFormData({
      monto: '',
      moneda_origen: 'USD',
      moneda_destino: 'VES'
    });
    setResultado(null);
    onHide();
  };

  const getTasaMoneda = (codigo) => {
    const tasa = tasas.find(t => t.codigo_moneda === codigo);
    return tasa ? parseFloat(tasa.tasa_cambio_usd) : 1;
  };

  const calcularConversionLocal = () => {
    if (!formData.monto || formData.monto <= 0) return null;

    const tasaOrigen = getTasaMoneda(formData.moneda_origen);
    const tasaDestino = getTasaMoneda(formData.moneda_destino);

    const montoEnUSD = parseFloat(formData.monto) / tasaOrigen;
    const montoConvertido = montoEnUSD * tasaDestino;

    return {
      monto_original: parseFloat(formData.monto),
      moneda_origen: formData.moneda_origen,
      monto_convertido: montoConvertido,
      moneda_destino: formData.moneda_destino,
      tasa_utilizada: (tasaDestino / tasaOrigen).toFixed(6)
    };
  };

  const conversionLocal = calcularConversionLocal();

  return (
    <Modal show={show} onHide={handleClose} size="lg" centered>
      <Modal.Header 
        closeButton
        style={{ 
          background: 'linear-gradient(135deg, rgba(139, 79, 184, 0.1) 0%, rgba(157, 91, 196, 0.1) 100%)',
          borderBottom: '2px solid rgba(139, 79, 184, 0.2)'
        }}
      >
        <Modal.Title style={{ color: '#8B4FB8', fontWeight: '700' }}>
          <i className="bi bi-calculator me-2"></i>
          Convertidor de Monedas
        </Modal.Title>
      </Modal.Header>
      <Form onSubmit={handleConvertir}>
        <Modal.Body className="p-4">
          <Alert 
            variant="light"
            className="mb-4"
            style={{ 
              borderLeft: '4px solid #8B4FB8',
              background: 'rgba(139, 79, 184, 0.05)'
            }}
          >
            <i className="bi bi-info-circle me-2" style={{ color: '#8B4FB8' }}></i>
            Realiza conversiones entre las monedas disponibles usando las tasas actuales del sistema.
          </Alert>

          <Row className="mb-4">
            <Col xs={12}>
              <Form.Group>
                <Form.Label className="fw-bold">
                  Monto a Convertir *
                </Form.Label>
                <Form.Control
                  type="number"
                  step="0.01"
                  name="monto"
                  value={formData.monto}
                  onChange={handleChange}
                  placeholder="0.00"
                  required
                  autoFocus
                  style={{ fontSize: '1.1rem', padding: '0.75rem' }}
                />
              </Form.Group>
            </Col>
          </Row>

          <Row className="align-items-center g-3">
            <Col xs={12} md={5}>
              <Form.Group>
                <Form.Label className="fw-bold">
                  Desde
                </Form.Label>
                <Form.Select
                  name="moneda_origen"
                  value={formData.moneda_origen}
                  onChange={handleChange}
                  required
                  style={{ padding: '0.75rem' }}
                >
                  {tasas.map((tasa) => (
                    <option key={tasa.codigo_moneda} value={tasa.codigo_moneda}>
                      {tasa.codigo_moneda} - {tasa.nombre_moneda || tasa.codigo_moneda}
                    </option>
                  ))}
                </Form.Select>
                {formData.moneda_origen !== 'USD' && (
                  <Form.Text className="text-muted">
                    1 {formData.moneda_origen} = ${(1 / getTasaMoneda(formData.moneda_origen)).toFixed(6)} USD
                  </Form.Text>
                )}
              </Form.Group>
            </Col>

            <Col xs={12} md={2} className="text-center">
              <Button
                variant="outline-secondary"
                onClick={handleIntercambiar}
                className="rounded-circle"
                style={{ 
                  width: '45px', 
                  height: '45px',
                  padding: 0,
                  marginTop: '1.5rem'
                }}
                title="Intercambiar monedas"
              >
                <i className="bi bi-arrow-left-right"></i>
              </Button>
            </Col>

            <Col xs={12} md={5}>
              <Form.Group>
                <Form.Label className="fw-bold">
                  Hacia
                </Form.Label>
                <Form.Select
                  name="moneda_destino"
                  value={formData.moneda_destino}
                  onChange={handleChange}
                  required
                  style={{ padding: '0.75rem' }}
                >
                  {tasas.map((tasa) => (
                    <option key={tasa.codigo_moneda} value={tasa.codigo_moneda}>
                      {tasa.codigo_moneda} - {tasa.nombre_moneda || tasa.codigo_moneda}
                    </option>
                  ))}
                </Form.Select>
                {formData.moneda_destino !== 'USD' && (
                  <Form.Text className="text-muted">
                    1 {formData.moneda_destino} = ${(1 / getTasaMoneda(formData.moneda_destino)).toFixed(6)} USD
                  </Form.Text>
                )}
              </Form.Group>
            </Col>
          </Row>

          {/* Vista previa en tiempo real */}
          {conversionLocal && formData.monto > 0 && (
            <Alert 
              variant="light" 
              className="mt-4"
              style={{ 
                border: '2px solid rgba(139, 79, 184, 0.2)',
                background: 'linear-gradient(135deg, rgba(139, 79, 184, 0.05) 0%, rgba(157, 91, 196, 0.05) 100%)'
              }}
            >
              <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
                <div className="text-center flex-fill">
                  <small className="text-muted d-block mb-1">Vista previa</small>
                  <h4 className="mb-0 fw-bold" style={{ color: '#8B4FB8' }}>
                    {formatCurrency(conversionLocal.monto_original, conversionLocal.moneda_origen)}
                  </h4>
                </div>
                <div className="text-center">
                  <i className="bi bi-arrow-right" style={{ fontSize: '2rem', color: '#8B4FB8' }}></i>
                  <br />
                  <Badge 
                    bg="light" 
                    text="dark"
                    style={{ 
                      border: '1px solid rgba(139, 79, 184, 0.3)',
                      marginTop: '0.5rem'
                    }}
                  >
                    Tasa: {conversionLocal.tasa_utilizada}
                  </Badge>
                </div>
                <div className="text-center flex-fill">
                  <small className="text-muted d-block mb-1">Resultado</small>
                  <h4 className="mb-0 fw-bold text-success">
                    {formatCurrency(conversionLocal.monto_convertido, conversionLocal.moneda_destino)}
                  </h4>
                </div>
              </div>
            </Alert>
          )}

          {/* Resultado oficial de la conversión */}
          {resultado && (
            <Alert 
              variant="success" 
              className="mt-4"
              style={{ 
                background: 'linear-gradient(135deg, rgba(40, 167, 69, 0.1) 0%, rgba(32, 201, 151, 0.1) 100%)',
                border: '2px solid rgba(40, 167, 69, 0.3)'
              }}
            >
              <h5 className="mb-3 fw-bold">
                <i className="bi bi-check-circle me-2"></i>
                Resultado de Conversión
              </h5>
              <Row className="g-3">
                <Col xs={12} md={5}>
                  <div className="text-center p-3 bg-white rounded shadow-sm">
                    <small className="text-muted d-block mb-2">Monto Original</small>
                    <h3 className="mb-0 fw-bold" style={{ color: '#8B4FB8' }}>
                      {formatCurrency(resultado.monto_original, resultado.moneda_origen)}
                    </h3>
                    <Badge bg="secondary" className="mt-2">{resultado.moneda_origen}</Badge>
                  </div>
                </Col>
                <Col xs={12} md={2} className="d-flex align-items-center justify-content-center">
                  <i className="bi bi-arrow-right text-success" style={{ fontSize: '2rem' }}></i>
                </Col>
                <Col xs={12} md={5}>
                  <div className="text-center p-3 bg-white rounded shadow-sm">
                    <small className="text-muted d-block mb-2">Monto Convertido</small>
                    <h3 className="mb-0 fw-bold text-success">
                      {formatCurrency(resultado.monto_convertido, resultado.moneda_destino)}
                    </h3>
                    <Badge bg="success" className="mt-2">{resultado.moneda_destino}</Badge>
                  </div>
                </Col>
              </Row>
              <div className="text-center mt-3">
                <small className="text-muted">
                  Tasa aplicada: <strong>{resultado.tasa_utilizada}</strong>
                </small>
              </div>
            </Alert>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleClose}>
            Cerrar
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
                Convirtiendo...
              </>
            ) : (
              'Convertir'
            )}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default ConvertidorModal;