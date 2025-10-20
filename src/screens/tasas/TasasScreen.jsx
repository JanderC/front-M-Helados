import { useState, useEffect } from 'react';
import { Row, Col, Card, Button, Form, Table, Badge, Alert, Spinner } from 'react-bootstrap';
import { monedasService } from '../../api/services/monedasService';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { toast } from 'react-toastify';
import EditarTasaModal from '../../components/monedas/EditarTasaModal';
import ConvertidorModal from '../../components/monedas/ConvertidorModal';

const TasasScreen = () => {
  const [tasas, setTasas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actualizandoBCV, setActualizandoBCV] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showConvertidorModal, setShowConvertidorModal] = useState(false);
  const [tasaSeleccionada, setTasaSeleccionada] = useState(null);
  const [guardando, setGuardando] = useState(false);

  // Tasas editables localmente
  const [tasasEditables, setTasasEditables] = useState({
    VES: '',
    COP: '',
    USD: '1'
  });

  useEffect(() => {
    loadTasas();
  }, []);

  const loadTasas = async () => {
    try {
      setLoading(true);
      const response = await monedasService.getTasas();
      const tasasData = response.data?.data || response.data || [];
      
      // Asegurar que siempre sea un array
      if (Array.isArray(tasasData)) {
        setTasas(tasasData);

        // Inicializar tasas editables
        const tasasObj = {};
        tasasData.forEach(tasa => {
          tasasObj[tasa.codigo_moneda] = tasa.tasa_cambio_usd;
        });
        setTasasEditables(tasasObj);
      } else {
        console.error('Las tasas no son un array:', tasasData);
        setTasas([]);
        toast.error('Error al cargar formato de tasas');
      }

    } catch (error) {
      console.error('Error al cargar tasas:', error);
      setTasas([]);
      toast.error('Error al cargar tasas de cambio');
    } finally {
      setLoading(false);
    }
  };

  const handleActualizarBCV = async () => {
    try {
      setActualizandoBCV(true);
      const response = await monedasService.actualizarBCV();
      
      toast.success('Tasa BCV actualizada correctamente');
      
      // Mostrar información adicional si está disponible
      if (response.data?.data?.fuente) {
        toast.info(`Fuente: ${response.data.data.fuente}`);
      }

      await loadTasas();
    } catch (error) {
      console.error('Error al actualizar BCV:', error);
      toast.error(error.response?.data?.message || 'Error al actualizar tasa BCV. Intente actualización manual.');
    } finally {
      setActualizandoBCV(false);
    }
  };

  const handleChangeTasa = (codigo, valor) => {
    setTasasEditables({
      ...tasasEditables,
      [codigo]: valor
    });
  };

  const handleGuardarTasas = async () => {
    try {
      setGuardando(true);
      const tasasArray = Object.entries(tasasEditables)
        .filter(([codigo, tasa]) => codigo !== 'USD' && tasa && parseFloat(tasa) > 0)
        .map(([codigo_moneda, tasa_cambio_usd]) => ({
          codigo_moneda,
          tasa_cambio_usd: parseFloat(tasa_cambio_usd)
        }));

      if (tasasArray.length === 0) {
        toast.warning('No hay tasas válidas para actualizar');
        return;
      }

      await monedasService.actualizarMultiples(tasasArray);
      toast.success('Tasas actualizadas correctamente');
      await loadTasas();

    } catch (error) {
      console.error('Error al guardar tasas:', error);
      toast.error('Error al actualizar tasas');
    } finally {
      setGuardando(false);
    }
  };

  const getTasaInfo = (codigo) => {
    return tasas.find(t => t.codigo_moneda === codigo);
  };

  const calcularEquivalencia = (codigo, monto = 1) => {
    const tasa = parseFloat(tasasEditables[codigo]) || 1;
    return monto * tasa;
  };

  if (loading) {
    return (
      <div className="d-flex flex-column justify-content-center align-items-center" style={{ minHeight: '400px' }}>
        <Spinner animation="border" style={{ color: '#8B4FB8', width: '3rem', height: '3rem' }} />
        <p className="mt-3" style={{ color: '#8B4FB8', fontWeight: '500' }}>Cargando tasas de cambio...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-4 gap-3">
        <div>
          <h2 className="fw-bold mb-1" style={{ color: '#8B4FB8', fontSize: 'clamp(1.5rem, 5vw, 2rem)' }}>
            <i className="bi bi-currency-exchange me-2"></i>
            Gestión de Tasas de Cambio
          </h2>
          <p className="text-muted mb-0 small">Administra las tasas de conversión de monedas</p>
        </div>
        <div className="d-flex gap-2 flex-wrap">
          <Button 
            variant="outline-primary" 
            onClick={() => setShowConvertidorModal(true)}
            disabled={tasas.length === 0}
            style={{ 
              borderColor: '#8B4FB8', 
              color: '#8B4FB8',
              fontWeight: '500'
            }}
            onMouseEnter={(e) => {
              if (tasas.length > 0) {
                e.target.style.background = '#8B4FB8';
                e.target.style.color = 'white';
              }
            }}
            onMouseLeave={(e) => {
              if (tasas.length > 0) {
                e.target.style.background = 'transparent';
                e.target.style.color = '#8B4FB8';
              }
            }}
          >
            <i className="bi bi-calculator me-2"></i>
            Convertidor
          </Button>
          <Button 
            onClick={loadTasas}
            style={{ 
              background: 'linear-gradient(135deg, #8B4FB8 0%, #9D5BC4 100%)',
              border: 'none',
              fontWeight: '500'
            }}
          >
            <i className="bi bi-arrow-clockwise me-2"></i>
            Actualizar
          </Button>
        </div>
      </div>

      {/* Alerta informativa */}
      <Alert 
        variant="light" 
        className="mb-4"
        style={{ 
          borderLeft: '4px solid #8B4FB8',
          background: 'linear-gradient(135deg, rgba(139, 79, 184, 0.05) 0%, rgba(157, 91, 196, 0.05) 100%)'
        }}
      >
        <i className="bi bi-info-circle me-2" style={{ color: '#8B4FB8' }}></i>
        <strong>Importante:</strong> Las tasas de cambio se utilizan para convertir todas las transacciones a USD (moneda base).
        Actualice las tasas regularmente para mantener cálculos precisos.
      </Alert>

      {/* Tarjetas de tasas actuales */}
      <Row className="mb-4 g-3">
        <Col xs={12} md={4}>
          <Card 
            className="border-0 shadow-sm h-100"
            style={{ 
              borderRadius: '16px',
              borderLeft: '6px solid #28a745'
            }}
          >
            <Card.Body className="p-4">
              <div className="d-flex justify-content-between align-items-start mb-3">
                <div>
                  <h6 className="text-muted mb-1 small" style={{ fontWeight: '500' }}>Dólar Estadounidense</h6>
                  <h3 className="fw-bold mb-0" style={{ color: '#28a745' }}>USD</h3>
                </div>
                <div 
                  style={{
                    background: 'rgba(40, 167, 69, 0.1)',
                    padding: '12px',
                    borderRadius: '12px'
                  }}
                >
                  <i className="bi bi-currency-dollar text-success" style={{ fontSize: '2rem' }}></i>
                </div>
              </div>
              <div className="d-flex justify-content-between align-items-center">
                <span className="text-muted small">Tasa Base</span>
                <Badge bg="success" className="px-3 py-2">1.00</Badge>
              </div>
              {getTasaInfo('USD') && (
                <small className="text-muted d-block mt-2">
                  Actualizado: {formatDateTime(getTasaInfo('USD').fecha_actualizacion)}
                </small>
              )}
            </Card.Body>
          </Card>
        </Col>

        <Col xs={12} md={4}>
          <Card 
            className="border-0 shadow-sm h-100"
            style={{ 
              borderRadius: '16px',
              borderLeft: '6px solid #17a2b8'
            }}
          >
            <Card.Body className="p-4">
              <div className="d-flex justify-content-between align-items-start mb-3">
                <div>
                  <h6 className="text-muted mb-1 small" style={{ fontWeight: '500' }}>Bolívar Venezolano</h6>
                  <h3 className="fw-bold mb-0" style={{ color: '#17a2b8' }}>VES (Bs.)</h3>
                </div>
                <div 
                  style={{
                    background: 'rgba(23, 162, 184, 0.1)',
                    padding: '12px',
                    borderRadius: '12px'
                  }}
                >
                  <i className="bi bi-cash-coin text-info" style={{ fontSize: '2rem' }}></i>
                </div>
              </div>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <span className="text-muted small">1 USD =</span>
                <Badge bg="info" className="px-3 py-2">
                  {parseFloat(tasasEditables.VES || 0).toFixed(2)} Bs.
                </Badge>
              </div>
              <Button 
                variant="info" 
                size="sm" 
                className="w-100"
                onClick={handleActualizarBCV}
                disabled={actualizandoBCV}
                style={{ fontWeight: '500' }}
              >
                {actualizandoBCV ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-2" />
                    Actualizando...
                  </>
                ) : (
                  <>
                    <i className="bi bi-cloud-download me-2"></i>
                    Actualizar desde BCV
                  </>
                )}
              </Button>
              {getTasaInfo('VES') && (
                <small className="text-muted d-block mt-2">
                  Actualizado: {formatDateTime(getTasaInfo('VES').fecha_actualizacion)}
                </small>
              )}
            </Card.Body>
          </Card>
        </Col>

        <Col xs={12} md={4}>
          <Card 
            className="border-0 shadow-sm h-100"
            style={{ 
              borderRadius: '16px',
              borderLeft: '6px solid #ffc107'
            }}
          >
            <Card.Body className="p-4">
              <div className="d-flex justify-content-between align-items-start mb-3">
                <div>
                  <h6 className="text-muted mb-1 small" style={{ fontWeight: '500' }}>Peso Colombiano</h6>
                  <h3 className="fw-bold mb-0" style={{ color: '#ffc107' }}>COP ($)</h3>
                </div>
                <div 
                  style={{
                    background: 'rgba(255, 193, 7, 0.1)',
                    padding: '12px',
                    borderRadius: '12px'
                  }}
                >
                  <i className="bi bi-cash text-warning" style={{ fontSize: '2rem' }}></i>
                </div>
              </div>
              <div className="d-flex justify-content-between align-items-center">
                <span className="text-muted small">1 USD =</span>
                <Badge bg="warning" text="dark" className="px-3 py-2">
                  {parseFloat(tasasEditables.COP || 0).toFixed(2)} $
                </Badge>
              </div>
              {getTasaInfo('COP') && (
                <small className="text-muted d-block mt-2">
                  Actualizado: {formatDateTime(getTasaInfo('COP').fecha_actualizacion)}
                </small>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Formulario de actualización manual */}
      <Card 
        className="border-0 shadow-sm mb-4"
        style={{ borderRadius: '16px' }}
      >
        <Card.Header 
          className="border-bottom-0"
          style={{ 
            background: 'linear-gradient(135deg, rgba(139, 79, 184, 0.1) 0%, rgba(157, 91, 196, 0.1) 100%)',
            borderRadius: '16px 16px 0 0',
            padding: '1.25rem'
          }}
        >
          <h5 className="mb-0 fw-bold" style={{ color: '#8B4FB8' }}>
            <i className="bi bi-pencil-square me-2"></i>
            Actualización Manual de Tasas
          </h5>
        </Card.Header>
        <Card.Body className="p-4">
          <Alert variant="warning" className="mb-4">
            <i className="bi bi-exclamation-triangle me-2"></i>
            <strong>Atención:</strong> Ingrese las tasas de cambio con respecto al dólar (USD). 
            Por ejemplo, si 1 USD = 4,000 COP, ingrese 4000 en el campo de COP.
          </Alert>

          <Row className="g-3">
            <Col xs={12} md={6}>
              <Form.Group>
                <Form.Label className="fw-bold">
                  Bolívar Venezolano (VES)
                  <small className="text-muted ms-2" style={{ fontWeight: '400' }}>1 USD = ? Bs.</small>
                </Form.Label>
                <div className="input-group">
                  <span className="input-group-text">Bs.</span>
                  <Form.Control
                    type="number"
                    step="0.01"
                    value={tasasEditables.VES}
                    onChange={(e) => handleChangeTasa('VES', e.target.value)}
                    placeholder="Ej: 205.50"
                  />
                </div>
                <Form.Text className="text-muted">
                  Equivalencia: 1 Bs. = ${(1 / parseFloat(tasasEditables.VES || 1)).toFixed(6)} USD
                </Form.Text>
              </Form.Group>
            </Col>

            <Col xs={12} md={6}>
              <Form.Group>
                <Form.Label className="fw-bold">
                  Peso Colombiano (COP)
                  <small className="text-muted ms-2" style={{ fontWeight: '400' }}>1 USD = ? $</small>
                </Form.Label>
                <div className="input-group">
                  <span className="input-group-text">$</span>
                  <Form.Control
                    type="number"
                    step="0.01"
                    value={tasasEditables.COP}
                    onChange={(e) => handleChangeTasa('COP', e.target.value)}
                    placeholder="Ej: 4000"
                  />
                </div>
                <Form.Text className="text-muted">
                  Equivalencia: 1 $ = ${(1 / parseFloat(tasasEditables.COP || 1)).toFixed(6)} USD
                </Form.Text>
              </Form.Group>
            </Col>
          </Row>

          <div className="d-flex justify-content-end gap-2 mt-4">
            <Button 
              variant="secondary" 
              onClick={loadTasas}
              disabled={guardando}
            >
              <i className="bi bi-x-circle me-2"></i>
              Cancelar
            </Button>
            <Button 
              onClick={handleGuardarTasas}
              disabled={guardando}
              style={{ 
                background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
                border: 'none',
                fontWeight: '500'
              }}
            >
              {guardando ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  Guardando...
                </>
              ) : (
                <>
                  <i className="bi bi-check-circle me-2"></i>
                  Guardar Tasas
                </>
              )}
            </Button>
          </div>
        </Card.Body>
      </Card>

      {/* Tabla de conversiones rápidas */}
      <Card 
        className="border-0 shadow-sm"
        style={{ borderRadius: '16px' }}
      >
        <Card.Header 
          className="border-bottom-0"
          style={{ 
            background: 'linear-gradient(135deg, rgba(139, 79, 184, 0.1) 0%, rgba(157, 91, 196, 0.1) 100%)',
            borderRadius: '16px 16px 0 0',
            padding: '1.25rem'
          }}
        >
          <h5 className="mb-0 fw-bold" style={{ color: '#8B4FB8' }}>
            <i className="bi bi-table me-2"></i>
            Tabla de Conversiones Rápidas
          </h5>
        </Card.Header>
        <Card.Body className="p-0">
          <div className="table-responsive">
            <Table hover className="mb-0">
              <thead style={{ background: 'rgba(139, 79, 184, 0.05)' }}>
                <tr>
                  <th style={{ padding: '1rem', color: '#8B4FB8', fontWeight: '600' }}>Moneda</th>
                  <th style={{ padding: '1rem', color: '#8B4FB8', fontWeight: '600' }}>Símbolo</th>
                  <th style={{ padding: '1rem', color: '#8B4FB8', fontWeight: '600' }}>Tasa vs USD</th>
                  <th className="text-end" style={{ padding: '1rem', color: '#8B4FB8', fontWeight: '600' }}>10 USD</th>
                  <th className="text-end" style={{ padding: '1rem', color: '#8B4FB8', fontWeight: '600' }}>50 USD</th>
                  <th className="text-end" style={{ padding: '1rem', color: '#8B4FB8', fontWeight: '600' }}>100 USD</th>
                  <th className="text-end" style={{ padding: '1rem', color: '#8B4FB8', fontWeight: '600' }}>500 USD</th>
                </tr>
              </thead>
              <tbody>
                {tasas.map((tasa) => (
                  <tr key={tasa.codigo_moneda}>
                    <td style={{ padding: '1rem' }}>
                      <strong>{tasa.codigo_moneda}</strong>
                      <br />
                      <small className="text-muted">{tasa.nombre_moneda || tasa.codigo_moneda}</small>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <Badge bg="secondary">{tasa.simbolo || tasa.codigo_moneda}</Badge>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <strong>{parseFloat(tasa.tasa_cambio_usd).toFixed(2)}</strong>
                    </td>
                    <td className="text-end" style={{ padding: '1rem' }}>
                      {formatCurrency(calcularEquivalencia(tasa.codigo_moneda, 10), tasa.codigo_moneda)}
                    </td>
                    <td className="text-end" style={{ padding: '1rem' }}>
                      {formatCurrency(calcularEquivalencia(tasa.codigo_moneda, 50), tasa.codigo_moneda)}
                    </td>
                    <td className="text-end" style={{ padding: '1rem' }}>
                      {formatCurrency(calcularEquivalencia(tasa.codigo_moneda, 100), tasa.codigo_moneda)}
                    </td>
                    <td className="text-end" style={{ padding: '1rem' }}>
                      {formatCurrency(calcularEquivalencia(tasa.codigo_moneda, 500), tasa.codigo_moneda)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </Card.Body>
      </Card>

      {/* Modales */}
      <EditarTasaModal
        show={showEditModal}
        onHide={() => setShowEditModal(false)}
        tasa={tasaSeleccionada}
        onSuccess={loadTasas}
      />

      {tasas.length > 0 && (
        <ConvertidorModal
          show={showConvertidorModal}
          onHide={() => setShowConvertidorModal(false)}
          tasas={tasas}
        />
      )}
    </div>
  );
};

export default TasasScreen;